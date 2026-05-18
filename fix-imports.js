const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  if (content.includes("from '@/app/api/auth/[...nextauth]/route'")) {
    content = content.replace(/import \{([^}]*authOptions[^}]*)\} from '@\/app\/api\/auth\/\[\.\.\.nextauth\]\/route';?/g, "import { $1 } from '@/lib/auth-options';");
    changed = true;
  }
  
  if (content.includes("from '@/lib/auth'")) {
    content = content.replace(/import \{([^}]*authOptions[^}]*)\} from '@\/lib\/auth';?/g, "import { $1 } from '@/lib/auth-options';");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed ' + filePath);
  }
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(f => replaceInFile(f));
