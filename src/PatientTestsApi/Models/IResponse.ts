export interface IResponse {
    body: unknown;
    headers: {
        [key: string]: string;
    };
    status: number;
}
