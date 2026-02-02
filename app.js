const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

const DATA_FILE = path.join(__dirname, 'data', 'students.json');

// Helper: Read Data
function getStudents() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) { return []; }
}

// Helper: Save Data
function saveStudents(students) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(students, null, 2));
}

// Multer Config
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, 'student-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 2000000 } 
}).single('studentPhoto');

// --- ROUTES ---

// Home Page: List & Search
app.get('/', (req, res) => {
  const students = getStudents();
  const searchQuery = req.query.search || '';
  const filtered = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  
  res.render('index', { 
    student: filtered, 
    searchQuery: searchQuery,
    totalCount: students.length 
  });
});

// Add Student
app.get('/addStudent', (req, res) => res.render('addStudent'));

app.post('/addStudent', upload, (req, res) => {
  const { name, dob, contact } = req.body;
  const students = getStudents();
  const photo = req.file ? req.file.filename : null;
  const newId = students.length > 0 ? Math.max(...students.map(s => s.studentId)) + 1 : 1;
  
  students.push({ studentId: newId, name, dob, contact, photo });
  saveStudents(students);
  res.redirect('/');
});

// View Individual Profile
app.get('/student/:id', (req, res) => {
  const student = getStudents().find(s => s.studentId === parseInt(req.params.id));
  student ? res.render('student', { student }) : res.status(404).send('Not Found');
});

// Edit Student
app.get('/editStudent/:id', (req, res) => {
  const student = getStudents().find(s => s.studentId === parseInt(req.params.id));
  res.render('editStudent', { student });
});

app.post('/editStudent/:id', upload, (req, res) => {
  const students = getStudents();
  const id = parseInt(req.params.id);
  const index = students.findIndex(s => s.studentId === id);

  if (index !== -1) {
    const oldPhoto = students[index].photo;
    const newPhoto = req.file ? req.file.filename : oldPhoto;
    
    // If a new photo is uploaded, delete the old one from disk
    if (req.file && oldPhoto) {
        const oldPath = path.join(__dirname, 'public/uploads', oldPhoto);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    students[index] = { ...students[index], ...req.body, photo: newPhoto };
    saveStudents(students);
  }
  res.redirect('/');
});

// Delete Student (with File Cleanup)
app.post('/deleteStudent/:id', (req, res) => {
  let students = getStudents();
  const id = parseInt(req.params.id);
  const student = students.find(s => s.studentId === id);

  if (student && student.photo) {
    const photoPath = path.join(__dirname, 'public/uploads', student.photo);
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
  }

  students = students.filter(s => s.studentId !== id);
  saveStudents(students);
  res.redirect('/');
});

// Only listen if this file is run directly (not imported for testing)
if (require.main === module) {
  app.listen(3000, () => console.log(`Server: http://localhost:3000`));
}

module.exports = app;