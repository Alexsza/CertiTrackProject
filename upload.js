const xlsx = require('xlsx');
const MongoClient = require('mongodb').MongoClient;

const uri = "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function connect() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const database = client.db('certitrackproject');
    const collection = database.collection('students');

    return collection;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

async function insertData(collection, sheetData) {
  try {
    const result = await collection.insertMany(sheetData);
    console.log('Data inserted into MongoDB:', result);
    return result;
  } catch (error) {
    console.error('Error inserting data into MongoDB:', error);
    throw error;
  }
}

async function processExcelData(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const collection = await connect();
    await insertData(collection, sheetData);
    client.close();

    return sheetData;
  } catch (error) {
    console.error('Error processing file data:', error);
    throw error;
  }
}

module.exports = { processExcelData };
