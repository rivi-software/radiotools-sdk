import {
  type SdkPublishedCollection,
  type SdkPublishedNews,
  type SdkPublishedNewsCollection,
  type SdkPublishedPage,
  type SdkPublishedPageCollection,
  type SdkPublishedPresenter,
  type SdkPublishedPresenterCollection,
  type SdkPublishedRecord,
  type SdkPublishedShow,
  type SdkPublishedShowCollection,
  sdkSchemas,
} from "./schemas";

/**
 * The four content types every station has, with fields fixed in RadioTools: their records
 * have typed `values`. A catalog type (`events`, `notices`) or a custom type RIVI added to one
 * station keeps the generic `SdkPublishedRecord`.
 */
export const DEFAULT_CONTENT_TYPES = ["news", "presenters", "shows", "pages"] as const;
export type DefaultContentTypeKey = (typeof DEFAULT_CONTENT_TYPES)[number];

type TypedRecords = {
  news: SdkPublishedNews;
  presenters: SdkPublishedPresenter;
  shows: SdkPublishedShow;
  pages: SdkPublishedPage;
};
type TypedCollections = {
  news: SdkPublishedNewsCollection;
  presenters: SdkPublishedPresenterCollection;
  shows: SdkPublishedShowCollection;
  pages: SdkPublishedPageCollection;
};

/** A published record of `type`: typed for a default type, generic for any other key. */
export type SdkPublishedRecordOf<T extends string> = T extends DefaultContentTypeKey
  ? TypedRecords[T]
  : SdkPublishedRecord;
/** A page of `type`'s published records: typed for a default type, generic for any other key. */
export type SdkPublishedCollectionOf<T extends string> = T extends DefaultContentTypeKey
  ? TypedCollections[T]
  : SdkPublishedCollection;

const records = {
  news: sdkSchemas.PublishedNews,
  presenters: sdkSchemas.PublishedPresenter,
  shows: sdkSchemas.PublishedShow,
  pages: sdkSchemas.PublishedPage,
};
const collections = {
  news: sdkSchemas.PublishedNewsCollection,
  presenters: sdkSchemas.PublishedPresenterCollection,
  shows: sdkSchemas.PublishedShowCollection,
  pages: sdkSchemas.PublishedPageCollection,
};

export function isDefaultContentType(type: string): type is DefaultContentTypeKey {
  return (DEFAULT_CONTENT_TYPES as readonly string[]).includes(type);
}

/** The parser for a record of `type`: the typed one for a default type. */
export function recordParser<T extends string>(type: T) {
  const schema = isDefaultContentType(type) ? records[type] : sdkSchemas.PublishedRecord;
  return { parse: (data: unknown) => schema.parse(data) as SdkPublishedRecordOf<T> };
}

/** The parser for a page of `type`'s records: the typed one for a default type. */
export function collectionParser<T extends string>(type: T) {
  const schema = isDefaultContentType(type) ? collections[type] : sdkSchemas.PublishedCollection;
  return { parse: (data: unknown) => schema.parse(data) as SdkPublishedCollectionOf<T> };
}

/**
 * `record` as its default type's typed record when it is one, or `null`: for another type, or for
 * a record whose values, published before its station moved onto the fixed schema, do not fit.
 * Use it where the type is only known at runtime, such as `getContentRecord` or `onContent`.
 */
export function asContentType<T extends DefaultContentTypeKey>(
  record: SdkPublishedRecord,
  type: T,
): TypedRecords[T] | null {
  if (record.type !== type) return null;
  const parsed = records[type].safeParse(record);
  return parsed.success ? (parsed.data as TypedRecords[T]) : null;
}
