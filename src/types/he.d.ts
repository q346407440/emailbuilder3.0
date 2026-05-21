declare module "he" {
  const he: {
    decode(html: string, options?: { strict?: boolean }): string;
    encode(text: string, options?: object): string;
  };
  export default he;
}
