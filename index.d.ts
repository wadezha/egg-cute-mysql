
import { Context } from "egg";

declare class Operator {
  escape(value: any, stringifyObjects?: boolean, timeZone?: string): string;
  escapeId(value: any, forbidQualified?: boolean): string;
  format(sql: string, args?: object | any[], stringifyObjects?: boolean, timeZone?: string): string;

  order(orders: any): string;
  count(sql?: string, values?: any): Promise<number>;
  info(sql?: string, values?: any): Promise<any>;
  list(sql?: string, values?: any): Promise<any>;
  insert(sql?: string, values?: any): Promise<any>;
  update(sql?: string, values?: any): Promise<any>;
  delete(sql?: string, values?: any): Promise<any>;
  page(sql?: string, values?: any, countSql?: string): Promise<{
    rows: any;
    total: number;
  }>;
}

declare class RDSConnection extends Operator {
  release(): Promise<void>;
  beginTransaction(): Promise<void>;
}

declare class RDSTransaction extends Operator {
  commit(): Promise<any>;
  rollback(): Promise<any>;
}

interface Literals {
  Literal(str: string): string;
  now: string;
}

declare class RDSClient extends Operator {
  beginTransactionScope(scope: (conn: RDSConnection) => any, ctx: Context): Promise<any>;
  getConnection(): Promise<RDSConnection>;
  beginTransaction(): Promise<RDSTransaction>;
  end(cb?: Function): Promise<void>;
  literals: Literals;
}

interface RDSClientOptions {
  host?: string;
  port?: string;
  user?: string;
  password?: string;
  database?: string;
  
  charset?: string;
  connectionLimit?: number;
  queueLimit?: number;
}

interface EggRDSClientOptions {
  app?: boolean;
  agent?: boolean;
  client?: RDSClientOptions;
  clients?: Record<string, RDSClientOptions>;
}

declare module 'egg' {
  interface Application {
    mysql: RDSClient & Singleton<RDSClient>;
  }

  interface EggAppConfig {
    mysql: EggRDSClientOptions;
  }
}