/**
 * Shared HTML parsing utilities using Cheerio
 * Re-exports all Cheerio types and functions for centralized dependency management
 */

// Cheerio uses module.exports = cheerio (CommonJS style)
// So we need to import it as a namespace
import * as cheerio from 'cheerio';

// Re-export the entire cheerio module
export = cheerio;
