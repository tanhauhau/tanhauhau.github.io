const fs = require('fs');
const path = require('path');

const noteName = process.argv[2];
const notesFolder = path.join(process.cwd(), './content/notes');
const todayDate = new Date();

const title = `${todayDate.getFullYear()}-${pad(
  todayDate.getMonth() + 1
)}-${pad(todayDate.getDate())} - ${noteName}`;

fs.writeFileSync(path.join(notesFolder, title + '.md'), '');

function pad(num) {
  return num < 10 ? '0' + num : num;
}
