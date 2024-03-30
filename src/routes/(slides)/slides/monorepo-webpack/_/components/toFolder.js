export default function toFolder([str]) {
  str = str.trim();
  const lines = str.split('\n');
  const result = [];
  let stack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const [_, space, type, name, link, comment] = line.match(
      /^(\s*)(\+|-)\s(.+?)(?:--> (.+?))?(\#.+?)?$/
    );
    const level = space.length / 2;
    let folderName = level === 0 ? '' : stack[level - 1].pathname;
    const file = {
      type: type === '+' ? 'D' : 'F',
      name,
      pathname: folderName + '/' + name,
      comment,
    };
    if (link) {
      file.link = relative(folderName, link);
      file.linkRelative = link;
    }
    if (level === 0) {
      result.push(file);
    } else {
      stack[level - 1].children.push(file);
    }
    if (file.type === 'D') {
      file.children = [];
      stack[level] = file;
    }
  }
  return result;
}

function relative(from, to) {
  const fromPath = from.split('/');
  const toParts = to.split('/');
  for (let i = 0; i < toParts.length; i++) {
    if (toParts[i] === '..') {
      fromPath.pop();
    } else if (toParts[i] === '.') {
    } else {
      fromPath.push(toParts[i]);
    }
  }
  return fromPath.join('/');
}
