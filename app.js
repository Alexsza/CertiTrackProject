var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { MongoClient } = require('mongodb');
const IPFS = require('ipfs-api');
const ejs = require('ejs');
const fs = require('fs');
const puppeteer = require('puppeteer');
const multer = require('multer');
const xlsx = require('xlsx');
let cid = '';

const ipfs = new IPFS({ host: '127.0.0.1', port: '5001', protocol: 'http' });
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(req, res, next) {
  res.cookie('AWSALB', 'some-value', { sameSite: 'None' });
  next();
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

const { processExcelData } = require('./upload');


// Add the file upload endpoint
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); // Set the destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Keep the original filename
  }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('dataFile'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const sheetData = await processExcelData(filePath);

    // Respond with success and the data processed from the Excel file
    res.json({ success: true, data: sheetData });
  } catch (error) {
    console.error('Error during file upload:', error);
    res.status(500).json({ success: false, error: 'Error during file upload' });
  }
});


const uri = "mongodb+srv://certitrackadmin:BR8OyDRjFz1IqytG@certitrackproject.83j0ojd.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function connect() {
    try {
      await client.connect();
      console.log('Connected to MongoDB');
  
      // List available databases
      const adminDb = client.db('admin');
      const databases = await client.db().admin().listDatabases();
      console.log('Available Databases:');
      console.log(databases);
  
      // Fetch and display a sample document from the collection
      const database = client.db('certitrackproject');
      const collection = database.collection('certitrackproject');
      const sampleDocument = await collection.findOne();
      console.log('Sample Document:');
      console.log(sampleDocument);

      app.get('/sendStudentId', async (req, res) => {
      const studentId = req.query.studentId;
      console.log('Received student ID:', studentId);

      try {
         const result = await collection.findOne({ student_id: parseInt(studentId) });
            if (!result) {
            console.log('No result found for student ID:', studentId);
            res.json({ success: false, message: 'No result found' });
            return;
            }

        if (result) {
          var awardDate = new Date(result.awardDate); // Convert the string to a Date object
          var formattedDate = awardDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

          var data = {
            student: {
              first_name: result.first_name,
              last_name: result.last_name
            },
            course: result.course,
            grade: {
              getPoints: function () {
                return result.grade_points;
              },
              getAwardDate: function () {
                return formattedDate;
              }
            },
            dt: formattedDate
          };

          fs.readFile('certificate.ejs', 'utf8', async function (err, template) {
            if (err) throw err;

            var renderedCertificate = ejs.render(template, data);

            fs.writeFile('template.html', renderedCertificate, async function (err) {
               if (err) {
               console.log('Error saving template HTML:', err);
                 res.status(500).json({ success: false, error: 'Error saving template HTML' });
                 return;
                }

              // Convert the HTML to PNG using Puppeteer
              const browser = await puppeteer.launch({ headless: "new" });
              const page = await browser.newPage();
              await page.setContent(renderedCertificate);
              const pngFile = 'certificate.png';
              await page.screenshot({ path: pngFile, fullPage: true });

              console.log('Certificate saved as certificate.png');

               const fileData = fs.readFileSync(pngFile);
    ipfs.add(fileData, function (err, result) {
      if (err) {
        console.log('Error adding file to IPFS:', err);
        res.status(500).json({ success: false, error: 'Error adding file to IPFS' });
        return;
      }

      if (result && result[0] && result[0].hash) {
        cid = result[0].hash;
        console.log('Certificate saved to IPFS with CID:', cid);

        res.json({
          success: true,
          cid: cid,
          generatedCID: cid
        });
      } else {
        console.log('Error adding file to IPFS');
        res.status(500).json({ success: false, error: 'Error adding file to IPFS' });
      }
    });

    await browser.close();
            });
          });

        } else {
          console.log('No result found');
          res.json({ success: false, message: 'No result found' });
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        res.status(500).json({ success: false, message: 'Error fetching student data' });
      }
    });

    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

connect();
