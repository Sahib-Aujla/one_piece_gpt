import * as dotenv from 'dotenv';
import { DataAPIClient } from '@datastax/astra-db-ts'
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import OpenAI from 'openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

dotenv.config();

type VectorMetric='euclidean' | 'cosine' | 'dot_product';
const { DATA_STAX_API_ENDPOINT,
    DATA_STAX_TOKEN,
    DATA_STAX_NAMESPACE,
    DATA_STAX_COLLECTION,
    OPENAI_API_KEY,

} = process.env

const openai=new OpenAI({apiKey:OPENAI_API_KEY});

const onePieceData:string[]=[
'https://www.reddit.com/r/OnePiece/comments/194j3kk/whats_the_best_theory_about_one_piece_that_youve/',
'https://www.reddit.com/r/OnePiece/comments/1k4a4sz/what_are_your_craziest_one_piece_theories/',
'https://en.wikipedia.org/wiki/One_Piece',
'https://onepiece.fandom.com/wiki/One_Piece',
'https://www.cbr.com/unanswered-one-piece-questions/',
'https://www.reddit.com/r/OnePiece/',
'https://www.reddit.com/r/OnePiece/comments/1lhpxpi/one_piece_chapter_1152_official_release_discussion/',
'https://onepiece.fandom.com/wiki/Chapter_1152',
'https://onepiece.fandom.com/wiki/Chapter_1150',
'https://onepiece.fandom.com/wiki/Chapter_1151',
'https://onepiece.fandom.com/wiki/Chapter_1149',
'https://onepiece.fandom.com/wiki/Chapter_1120',
  'https://onepiece.fandom.com/wiki/Chapter_1121',
  'https://onepiece.fandom.com/wiki/Chapter_1122',
  'https://onepiece.fandom.com/wiki/Chapter_1123',
  'https://onepiece.fandom.com/wiki/Chapter_1124',
  'https://onepiece.fandom.com/wiki/Chapter_1125',
  'https://onepiece.fandom.com/wiki/Chapter_1126',
  'https://onepiece.fandom.com/wiki/Chapter_1127',
  'https://onepiece.fandom.com/wiki/Chapter_1128',
  'https://onepiece.fandom.com/wiki/Chapter_1129',
  'https://onepiece.fandom.com/wiki/Chapter_1130',
  'https://onepiece.fandom.com/wiki/Chapter_1131',
  'https://onepiece.fandom.com/wiki/Chapter_1132',
  'https://onepiece.fandom.com/wiki/Chapter_1133',
  'https://onepiece.fandom.com/wiki/Chapter_1134',
  'https://onepiece.fandom.com/wiki/Chapter_1135',
  'https://onepiece.fandom.com/wiki/Chapter_1136',
  'https://onepiece.fandom.com/wiki/Chapter_1137',
  'https://onepiece.fandom.com/wiki/Chapter_1138',
  'https://onepiece.fandom.com/wiki/Chapter_1139',
  'https://onepiece.fandom.com/wiki/Chapter_1140',
  'https://onepiece.fandom.com/wiki/Chapter_1141',
  'https://onepiece.fandom.com/wiki/Chapter_1142',
  'https://onepiece.fandom.com/wiki/Chapter_1143',
  'https://onepiece.fandom.com/wiki/Chapter_1144',
  'https://onepiece.fandom.com/wiki/Chapter_1145',
  'https://onepiece.fandom.com/wiki/Chapter_1146',
  'https://onepiece.fandom.com/wiki/Chapter_1147',
  'https://onepiece.fandom.com/wiki/Chapter_1148',
    'https://onepiece.fandom.com/wiki/Chapter_1100',
  'https://onepiece.fandom.com/wiki/Chapter_1101',
  'https://onepiece.fandom.com/wiki/Chapter_1102',
  'https://onepiece.fandom.com/wiki/Chapter_1103',
  'https://onepiece.fandom.com/wiki/Chapter_1104',
  'https://onepiece.fandom.com/wiki/Chapter_1105',
  'https://onepiece.fandom.com/wiki/Chapter_1106',
  'https://onepiece.fandom.com/wiki/Chapter_1107',
  'https://onepiece.fandom.com/wiki/Chapter_1108',
  'https://onepiece.fandom.com/wiki/Chapter_1109',
  'https://onepiece.fandom.com/wiki/Chapter_1110',
  'https://onepiece.fandom.com/wiki/Chapter_1111',
  'https://onepiece.fandom.com/wiki/Chapter_1112',
  'https://onepiece.fandom.com/wiki/Chapter_1113',
  'https://onepiece.fandom.com/wiki/Chapter_1114',
  'https://onepiece.fandom.com/wiki/Chapter_1115',
  'https://onepiece.fandom.com/wiki/Chapter_1116',
  'https://onepiece.fandom.com/wiki/Chapter_1117',
  'https://onepiece.fandom.com/wiki/Chapter_1118',
  'https://onepiece.fandom.com/wiki/Chapter_1119',

]

const client=new DataAPIClient(DATA_STAX_TOKEN);

const db=client.db(DATA_STAX_API_ENDPOINT||'',{keyspace:DATA_STAX_NAMESPACE});

const splitter=new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
})


const createCOllection=async(similarityMetric:VectorMetric='dot_product')=>{
    try{
        const res=await db.createCollection(DATA_STAX_COLLECTION ||'',{
        vector:{
            dimension: 1536,
            metric:similarityMetric
        }
        });
        console.log("Collection created successfully:", res);
    }catch(error){
        console.error("Error creating collection:", error);
    }
}


const loadSampleData=async()=>{
    try {
        const collection = db.collection(DATA_STAX_COLLECTION || '');
        for await (const item of onePieceData) {
            const content=await scrapeUrl(item);
            const chunks=await splitter.splitText(content);
            for await (const chunk of chunks){
                const embedding=await openai.embeddings.create({
                    model:'text-embedding-3-small',
                    input: chunk,
                    encoding_format:'float'
                })
                const vector=embedding.data[0].embedding;
                const res=await collection.insertOne({
                    $vector:vector,
                    text:chunk
                })
                console.log("Inserted chunk:", res);
            }
        }
    } catch (error) {
        console.log("Error loading sample data:", error);
    }
}

const scrapeUrl=async(url:string):Promise<string>=>{
    try {
        
       const loader=new PuppeteerWebBaseLoader(url,{
        launchOptions:{
            headless: true,
        },
        gotoOptions:{
            waitUntil:'domcontentloaded'
        },
        evaluate:async(page,browser)=>{
            const result=await page.evaluate(()=>document.body.innerHTML);
            browser.close();
            return result;
        }
       })
       return (await loader.scrape())?.replace(/<[^>]*>/gm, '').trim() || '';
    } catch (error) {
        console.error("Error scraping URL:", error);
        return '';
        
    }
}


createCOllection().then(()=>loadSampleData())