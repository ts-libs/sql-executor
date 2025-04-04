import { AllexEvent } from "./deps.ts";

export interface IQueryRow {
  readonly [index:number|string]: string|number|object;
}
export interface IQueryResult {
  readonly [index:number] : IQueryRow;
  readonly affectedRows: number;
}
export interface IQueryable {
  query(queryString:string): Promise<Array<IQueryResult>>;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  get statementDelimiter():string;
  get connected():boolean;
  disconnected: AllexEvent<void>;
}

export interface IQueueable {
  get query(): string;
  get sqlStatementCount(): number;
  process(result:Array<IQueryResult>, resultOffset:number): void;
}

export interface IResolvable<T> {
  get promise() :Promise<T>;
}
