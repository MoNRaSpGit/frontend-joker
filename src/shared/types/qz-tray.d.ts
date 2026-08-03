declare module "qz-tray" {
  const qz: {
    websocket: {
      isActive: () => boolean;
      connect: () => Promise<void>;
    };
    printers: {
      find: () => Promise<string[]>;
    };
    configs: {
      create: (printer: string, options?: Record<string, unknown>) => unknown;
    };
    print: (config: unknown, data: string[]) => Promise<void>;
    security: {
      setCertificatePromise: (
        promiseHandler: (resolve: (certificate: string) => void, reject: (error: unknown) => void) => void
      ) => void;
      setSignatureAlgorithm: (algorithm: "SHA1" | "SHA256" | "SHA512") => void;
      setSignaturePromise: (
        promiseFactory: (
          toSign: string
        ) => (resolve: (signature: string) => void, reject: (error: unknown) => void) => void
      ) => void;
    };
  };
  export default qz;
}
