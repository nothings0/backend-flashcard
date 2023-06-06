function calculateAccuracy(word, referenceWord) {
  const editDistance = levenshteinDistance(word, referenceWord);
  const maxLength = Math.max(word.length, referenceWord.length);
  const accuracy = (1 - editDistance / maxLength) * 100;
  return accuracy.toFixed(2);
}

function levenshteinDistance(word1, word2) {
  const cleanWord1 = word1
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, "");
  const cleanWord2 = word2
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, "");

  const m = cleanWord1.length;
  const n = cleanWord2.length;

  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (cleanWord1[i - 1] === cleanWord2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Xóa
          dp[i][j - 1] + 1, // Thêm
          dp[i - 1][j - 1] + 1 // Sửa
        );
      }
    }
  }

  return dp[m][n];
}
const PERCENT = 0.66;
function generateWordHint(word) {
  const hint = word
    .split("")
    .map(() => "_")
    .join("");

  let replacedCount = hint.length;
  if (replacedCount > Math.floor(hint.length * PERCENT)) {
    const hintChars = hint.split("");
    while (replacedCount > Math.ceil(hint.length * PERCENT)) {
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

module.exports = { calculateAccuracy, generateWordHint };
