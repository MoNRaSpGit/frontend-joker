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
  };
  export default qz;
}
