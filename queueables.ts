import {IQueueable, IResolvable, IQueryResult, IQueryRow} from './interfaces.ts';
import { Defer } from "./deps.ts";
import { valueOf } from "./syntax.ts";

export type QueableResolveFunctionType = {<T>(r:T):void};

export abstract class QueableItem<T> implements IQueueable, IResolvable<T> {
  abstract get query(): string;
  abstract get sqlStatementCount(): number;
  private defer: Defer<T> = new Defer<T>();
  constructor(resolveFunc?:QueableResolveFunctionType) {
    if (resolveFunc) {
      this.defer.promise.then(resolveFunc);
    }
  }
  process(result: Array<IQueryResult>, resultOffset: number): void {
    this.defer.resolve(this.produceValueForResolve(result, resultOffset));
  }
  get promise(): Promise<T> {
    return this.defer.promise;
  }
  protected abstract produceValueForResolve(result: Array<IQueryResult>, resultOffset: number):T;
}

interface InsertResult {
  affectedRows: number;
}
export type RecordType = { [k: string]: boolean|string|number };

export class Insert extends QueableItem<InsertResult> {
  override get query(): string {
    if (this.myQuery.length<1) {
      throw new Error('Insert has no rows to insert');
    }
    return `${this.myQuery} ${this.myValues}`;
  }
  override get sqlStatementCount(): number {
    return 1;
  }
  protected override produceValueForResolve(result: Array<IQueryResult>, resultOffset: number): InsertResult {
    const myResult = result[resultOffset];
    return {affectedRows: myResult.affectedRows};
  }


  addRow(row: RecordType) {
    if (this.fields.length<1) {
      this.setFieldsFrom(row);
    }
    if (this.myValues.length>0) {
      this.myValues += ',';
    }
    this.myValues += this.rowToValues(row);
  }
  addRows(rows: RecordType[]) {
    for(const row of rows) {
      this.addRow(row);
    }
  }
  private fields: string[] = [];
  private table: string;
  private myQuery: string = '';
  private myValues: string = '';
  private constructor (table:string, resolveFunc?:QueableResolveFunctionType) {
    super(resolveFunc);
    this.table = table;
  }

  private setFieldsFrom(row: RecordType) {
    this.setFieldsArray(Object.keys(row));
  }

  private setFieldsArray(fields: string[]) {
    this.fields = fields;
    this.myQuery = `INSERT INTO ${this.table} (${this.fields.join(',')}) VALUES`;
  }

  private rowToValues(row: RecordType) : string{
    if (this.fields.length<1) {
      throw new Error('Cannot insert a row without fields');
    }
    return "("+this.fields.map(f => valueOf(row[f])).join(',')+")";
  }

  static FromFields(table:string, fields: string[], resolveFunc?:QueableResolveFunctionType) {
    const returnValue = new Insert(table, resolveFunc);
    returnValue.setFieldsArray(fields);
    return returnValue;
  }
  
  static FromRow(table:string, row: RecordType, resolveFunc?:QueableResolveFunctionType) {
    const returnValue = new Insert(table, resolveFunc);
    returnValue.addRow(row);
    return returnValue;
  }
  
  static FromRows(table:string, rows: RecordType[], resolveFunc?:QueableResolveFunctionType) {
    const returnValue = new Insert(table, resolveFunc);
    returnValue.addRows(rows);
    return returnValue;
  }
}

export class Lookup<T> extends QueableItem<T> {
  private myQuery: string;
  private myWhat: string|string[];
  constructor (table: string, what: string|string[], where: string, resolveFunc?:{<T>(r:T):void}) {
    super(resolveFunc);
    this.myWhat = what;
    this.myQuery = `SELECT ${this.whatClause} FROM ${table} ${where ? `WHERE ${where}`: ''}`;
  }
  override get query(): string {
    return this.myQuery;
  }
  override get sqlStatementCount(): number {
    return 1;
  }
  protected override produceValueForResolve(result: Array<IQueryResult>, resultOffset: number): T {
    return this.rowResult(result[resultOffset][0]);
  }

  private get whatClause() : string {
    if (!Array.isArray(this.myWhat)) {
      return this.myWhat;
    }
    return this.myWhat.join(',');
  }

  private rowResult(row: IQueryRow) : T {
    if (!Array.isArray(this.myWhat)) {
      return row?.[this.myWhat] as T;
    }
    return this.myWhat.map(w => row?.[w]) as T;
  }
}
