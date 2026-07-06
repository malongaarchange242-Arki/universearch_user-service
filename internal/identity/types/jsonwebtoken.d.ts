declare module 'jsonwebtoken' {
  export interface JwtPayload {
    [key: string]: any;
  }

  export interface SignOptions {
    expiresIn?: string | number;
  }

  const jwt: {
    sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions): string;
    verify(token: string, secretOrPublicKey: string): string | JwtPayload;
  };

  export default jwt;
}
