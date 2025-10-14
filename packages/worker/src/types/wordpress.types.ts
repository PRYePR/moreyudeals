/**
 * WordPress REST API 类型定义
 * 用于 Sparhamster API 响应数据
 */

/**
 * WordPress Post 对象
 * 来自 WordPress REST API v2
 */
export interface WordPressPost {
  id: number;
  date: string;                    // ISO 8601 格式
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;                    // 文章 URL
  title: {
    rendered: string;              // HTML 格式标题
  };
  content: {
    rendered: string;              // HTML 格式内容
    protected: boolean;
  };
  excerpt: {
    rendered: string;              // HTML 格式摘要
    protected: boolean;
  };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  meta: any[];
  categories: number[];
  tags: number[];

  /**
   * Embedded 资源 (使用 ?_embed=true 参数时返回)
   */
  _embedded?: {
    /**
     * 特色图片 (Featured Media)
     */
    'wp:featuredmedia'?: Array<{
      id: number;
      date: string;
      slug: string;
      type: string;
      link: string;
      title: {
        rendered: string;
      };
      author: number;
      caption: {
        rendered: string;
      };
      alt_text: string;
      media_type: string;
      mime_type: string;
      media_details: {
        width: number;
        height: number;
        file: string;
        sizes: Record<string, {
          file: string;
          width: number;
          height: number;
          mime_type: string;
          source_url: string;
        }>;
      };
      source_url: string;           // 图片 URL
    }>;

    /**
     * 分类和标签 (Terms)
     */
    'wp:term'?: Array<
      Array<{
        id: number;
        link: string;
        name: string;
        slug: string;
        taxonomy: string;
      }>
    >;

    /**
     * 作者信息
     */
    'author'?: Array<{
      id: number;
      name: string;
      url: string;
      description: string;
      link: string;
      slug: string;
      avatar_urls: Record<string, string>;
    }>;
  };
}

/**
 * WordPress API 列表响应的元数据 (从响应头获取)
 */
export interface WordPressApiMeta {
  totalPosts: number;               // X-WP-Total
  totalPages: number;               // X-WP-TotalPages
  currentPage: number;
  perPage: number;
}
