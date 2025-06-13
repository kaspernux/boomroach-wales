import {
    generateKeyPair,
    signBytes,
    verifySignature,
    getUtf8Encoder,
    getBase58Decoder
} from "@solana/kit";

const keys = await generateKeyPair();
const message = getUtf8Encoder().encode("Hello, World!");
const signedBytes = await signBytes(keys.privateKey, message);

const decoded = getBase58Decoder().decode(signedBytes);
console.log("Signature:", decoded);

const verified = await verifySignature(keys.publicKey, signedBytes, message);
console.log("Verified:", verified);

export function verifySignature(publicKey: string, signedBytes: string, message: string) {
    const pubKey = new PublicKey(publicKey);
    const sigBytes = Buffer.from(signedBytes, "base64");
    const msgBytes = Buffer.from(message, "utf8");
    return verify(msgBytes, sigBytes, pubKey.toBytes());
}
