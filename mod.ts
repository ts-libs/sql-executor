
import { AllexEventItem, Queue, Job } from "./deps.ts";
import {IQueueable, IQueryable} from './interfaces.ts';
export * from './interfaces.ts';
export * from './queueables.ts';

class SqlExecutionQueueJob extends Job<void> {
  private queryable: IQueryable;
  private queueable: IQueueable|Array<IQueueable>;
  constructor (queryable: IQueryable, queueable: IQueueable|Array<IQueueable>) {
    super();
    this.queryable = queryable;
    this.queueable = queueable;
  }
  override async main() {
    await this.doConnect();
    const finalQuery = Array.isArray(this.queueable) ? this.queueable.map(qable => qable.query).join(this.queryable.statementDelimiter) : this.queueable.query;
    const results = await this.queryable.query(finalQuery);
    if (!Array.isArray(this.queueable)) {
      this.queueable.process(results,0);
      this.resolve();
      return;
    }
    let resultOffset = 0;
    for (const qable of this.queueable) {
      if (resultOffset >= results.length) {
        throw new Error(`Sql Results exhausted, there were ${results.length} of them, and the processing offset reached ${resultOffset}`);
      }
      qable.process(results, resultOffset);
      resultOffset += qable.sqlStatementCount;
    }
  }

  private async doConnect () : Promise<void> {
    while (!this.queryable.connected) {
      try {
        await this.queryable.connect();
      } catch (e) {
        console.error(e);
      }
    }
  }
}


export class SQLExecutor {
  private queryable: IQueryable;
  private q: Queue = new Queue();
  private queryableDisconnectionListener: AllexEventItem<void>;
  
  constructor(queryable: IQueryable) {
    this.queryable = queryable;
    this.queryableDisconnectionListener = this.queryable.disconnected.attach(() => console.error('SQL Executor disconnected'));
  }

  queue(queueable: IQueueable|Array<IQueueable>): Promise<void> {
    return this.q.run(new SqlExecutionQueueJob(this.queryable, queueable));
    /*
    await this.doConnect();
    const finalQuery = Array.isArray(queueable) ? queueable.map(qable => qable.query).join(this.queryable.statementDelimiter) : queueable.query;
    const results = await this.queryable.query(finalQuery);
    if (!Array.isArray(queueable)) {
      queueable.process(results,0);
      return;
    }
    let resultOffset = 0;
    for (const qable of queueable) {
      if (resultOffset >= results.length) {
        throw new Error(`Sql Results exhausted, there were ${results.length} of them, and the processing offset reached ${resultOffset}`);
      }
      qable.process(results, resultOffset);
      resultOffset += qable.sqlStatementCount;
    }
    */
  }

  async close() {
    await this.queryable?.disconnect();
  }

}