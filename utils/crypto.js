const crypto = require("crypto");

const SECRET_KEY = process.env.CRYPTO_SECRET || "zentara_secret_key";

const KEY = crypto.createHash("sha256").update(SECRET_KEY).digest();
const IV = Buffer.alloc(16, 0);

function encrypt(text) {
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, IV);
  return cipher.update(text, "utf8", "hex") + cipher.final("hex");
}

function decrypt(text) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, IV);
  return decipher.update(text, "hex", "utf8") + decipher.final("utf8");
}

module.exports = { encrypt, decrypt };