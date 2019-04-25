const emojiRegex = require('emoji-regex');

export function sanitizeEmoji(text) {
  return text.replace(emojiRegex(), val => `<span class="emoji">${val}</span>`);
}
