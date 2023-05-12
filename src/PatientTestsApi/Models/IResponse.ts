export interface IResponse {
    body: unknown;
    headers: {
        [key: string]: any;
    };
    status: number;
}
