function generateWordHint(word) {
  const hint = word
    .split("")
    .map(() => "_")
    .join("");

  let replacedCount = hint.length;
  if (replacedCount > Math.floor(hint.length * 0.66)) {
    const hintChars = hint.split("");
    while (replacedCount > Math.ceil(hint.length * 0.66)) {
      let i = Math.floor(Math.random() * hint.length);
      if (hintChars[i] === "_") {
        hintChars[i] = word[i];
        replacedCount--;
      }
    }
    return hintChars.join("");
  }

  return hint;
}
console.log(generateWordHint("hothothot", 80));
