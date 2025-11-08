/**
 * Shared HTML parsing utilities using Cheerio
 * Re-exports all Cheerio types and functions for centralized dependency management
 */

// Cheerio 是 CommonJS 模块,需要用这种方式导入和导出
import cheerio = require('cheerio');
export = cheerio;
