const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
exports.app = app;

app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, unique);
  }
});
const upload = multer({ storage });

/**
 * Delete a local avatar file if it exists and is within uploads directory.
 * Avatar paths in student objects are stored as '/uploads/<filename>' for local files.
 */
function deleteAvatarFile(avatarPath) {
  if (!avatarPath || typeof avatarPath !== 'string') return;
  if (!avatarPath.startsWith('/uploads/')) return; // ignore external URLs / placeholders
  const fullPath = path.join(__dirname, 'public', avatarPath);
  fs.unlink(fullPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Failed to delete avatar file:', fullPath, err);
    } else {
      console.log('Deleted avatar file:', fullPath);
    }
  });
}

/**
 * Cleanup orphaned avatar files (files in uploads/ not referenced by any student).
 * Only deletes files older than ORPHAN_AGE_MS to avoid removing recent uploads
 * during a restart when students might not yet be fully persisted.
 */
function cleanupOrphanedAvatars() {
  const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Failed to read uploads dir for cleanup:', err);
      return;
    }
    const usedFiles = new Set(
      students
        .map(s => s.avatar)
        .filter(a => a && a.startsWith('/uploads/'))
        .map(a => a.replace('/uploads/', ''))
    );
    files.forEach((file) => {
      if (!usedFiles.has(file)) {
        const filePath = path.join(uploadDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) {
            if (err.code !== 'ENOENT') console.error('Failed to stat file', filePath, err);
            return;
          }
          const age = Date.now() - stats.mtimeMs;
          if (age > ORPHAN_AGE_MS) {
            fs.unlink(filePath, (err) => {
              if (err && err.code !== 'ENOENT') {
                console.error('Failed to delete orphaned avatar', filePath, err);
              } else {
                console.log('Deleted orphaned avatar:', filePath);
              }
            });
          } else {
            console.log('Skipping recent orphaned avatar (not old enough):', filePath);
          }
        });
      }
    });
  });
} 

// Data persistence setup
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const studentsFile = path.join(dataDir, 'students.json');

function loadStudents() {
  try {
    if (fs.existsSync(studentsFile)) {
      const raw = fs.readFileSync(studentsFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load students from disk:', err);
  }
  // fallback defaults
  const defaultStudents = [
    { studentId: 1, name: 'Peter Tan', dob: '2000-05-10', contact: '91234567', avatar: 'https://via.placeholder.com/80' },
    { studentId: 2, name: 'Mary Lee', dob: '2001-07-12', contact: '98765432', avatar: 'https://via.placeholder.com/80' },
  ];
  try { fs.writeFileSync(studentsFile, JSON.stringify(defaultStudents, null, 2)); } catch (e) { console.error('Failed to write default students to disk', e); }
  return defaultStudents;
}

function saveStudents() {
  try {
    fs.writeFileSync(studentsFile, JSON.stringify(students, null, 2));
  } catch (err) {
    console.error('Failed to save students to disk:', err);
  }
}

// Load students from disk (persisted across restarts)
let students = loadStudents();

// Run cleanup once at startup and schedule daily cleanup (skip during tests)
if (process.env.NODE_ENV !== 'test') {
  cleanupOrphanedAvatars();
  var cleanupInterval = setInterval(cleanupOrphanedAvatars, 24 * 60 * 60 * 1000); // every 24 hours
}

// Home Page with search
app.get('/', (req, res) => {
  const keyword = req.query.search;
  let filtered = students;

  if (keyword) {
    filtered = students.filter(s =>
      s.name.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  res.render('index', { students: filtered, search: keyword || '' });
});

// Display a single student
app.get('/student/:id', (req, res) => {
  const studentId = parseInt(req.params.id);
  const student = students.find((s) => s.studentId === studentId);

  if (student) {
    res.render('student', { student });
  } else {
    res.status(404).send('Student not found');
  }
});

// Show Add Student form
app.get('/addStudent', (req, res) => {
  res.render('addStudent');
});

// Handle Add Student form submission
app.post('/addStudent', upload.single('avatar'), (req, res) => {
  const { name, dob, contact } = req.body;

  if (!name || !dob || !contact) {
    return res.status(400).send('All fields are required.');
  }

  const avatar = req.file ? '/uploads/' + req.file.filename : 'https://via.placeholder.com/80';

  const newId = students.length > 0 ? Math.max(...students.map((s) => s.studentId)) + 1 : 1;
  students.push({ studentId: newId, name, dob, contact, avatar });
  saveStudents();
  res.redirect('/');
});

// Show Edit Student form
app.get("/editStudent/:id", (req, res) => {
  const studentId = parseInt(req.params.id);
  const student = students.find((s) => s.studentId === studentId);

  if (!student) {
    return res.status(404).send("Student not found");
  }

  res.render("editStudent", { student });
});

// Handle Edit Student form submission
app.post("/editStudent/:id", upload.single('avatar'), (req, res) => {
  const studentId = parseInt(req.params.id);
  const { name, dob, contact } = req.body;

  // Validate required fields
  if (!name || !dob || !contact) {
    return res.status(400).send('All fields are required.');
  }

  const idx = students.findIndex((s) => s.studentId === studentId);
  if (idx === -1) {
    return res.status(404).send("Student not found");
  }

  const previousAvatar = students[idx].avatar;

  // If a new avatar was uploaded, delete the previous local avatar (if any)
  let avatar;
  if (req.file) {
    avatar = '/uploads/' + req.file.filename;
    if (previousAvatar && previousAvatar.startsWith('/uploads/')) {
      deleteAvatarFile(previousAvatar);
    }
  } else {
    avatar = previousAvatar || 'https://via.placeholder.com/80';
  }

  students[idx] = { studentId, name, dob, contact, avatar };
  saveStudents();
  res.redirect("/");
});

// Delete a student
app.post('/deleteStudent/:id', (req, res) => {
  const studentId = parseInt(req.params.id);
  const student = students.find((s) => s.studentId === studentId);
  if (student) {
    if (student.avatar && student.avatar.startsWith('/uploads/')) {
      deleteAvatarFile(student.avatar);
    }
    students = students.filter((s) => s.studentId !== studentId);
    saveStudents();
  }
  res.redirect('/');
});

// Start the server
const PORT = process.env.PORT || 3000;

if (require.main == module){
  app.listen(PORT, () =>
    console.log(`Server running at: http://localhost:${PORT}/`)
);
}

// Export for testing
app.resetStudents = function() {
  students = loadStudents();
};

app.getStudents = function() {
  return students;
};

app.stopCleanupInterval = function() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
};

module.exports = app;
