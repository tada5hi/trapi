export type Logger = {
    info: (msg: string) => void;
    debug: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    success: (msg: string) => void;
    section: (title: string) => void;
    kv: (key: string, value: string, padTo?: number) => void;
    blank: () => void;
};
