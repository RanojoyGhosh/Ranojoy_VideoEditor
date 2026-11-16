/** Shapes returned by the Instagram API with Instagram Login (graph.instagram.com). */

export interface IgPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
  previous?: string;
}

export interface IgPage<T> {
  data: T[];
  paging?: IgPaging;
}

export interface IgMe {
  /** App-scoped user ID. */
  id: string;
  /** Instagram professional account ID (the one webhooks use). */
  user_id?: string;
  username: string;
  account_type?: string;
  name?: string;
  profile_picture_url?: string;
  media_count?: number;
}

export interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type?: string; // FEED | REELS | STORY | AD
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  timestamp: string;
  comments_count?: number;
}

export interface IgComment {
  id: string;
  text?: string;
  timestamp: string;
  username?: string;
  from?: { id: string; username?: string };
  parent_id?: string;
  like_count?: number;
  hidden?: boolean;
  replies?: IgPage<IgComment>;
}

export interface IgTokenRefresh {
  access_token: string;
  token_type?: string;
  /** Seconds until the refreshed token expires (about 60 days). */
  expires_in: number;
}

export interface IgErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface IgDebugToken {
  data: {
    app_id?: string;
    type?: string; // USER | SYSTEM_USER | PAGE | ...
    is_valid?: boolean;
    /** Unix seconds; 0 = never expires. */
    expires_at?: number;
    data_access_expires_at?: number;
    scopes?: string[];
    user_id?: string;
  };
}
