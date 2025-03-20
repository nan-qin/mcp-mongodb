import { MongoClient, Db, Collection } from 'mongodb';

 const client = await MongoClient.connect("mongodb://localhost:27017/");
 const db = client.db("common");

 const a =await db.listCollections().toArray()

 console.log(a)

 
 console.log(JSON.stringify(a))