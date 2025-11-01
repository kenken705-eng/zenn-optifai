#!/usr/bin/env node

/**
 * 全Optifai記事を一括でZenn形式に変換
 */

const fs = require('fs');
const path = require('path');
const { convertArticle } = require('./convert-article');

const ARTICLES_DIR = '/home/user2025/projects/Optifai-App/src/app/media/content/articles';
const OUTPUT_DIR = './articles';

// バックアップファイルを除外するパターン
const EXCLUDE_PATTERNS = [
  /-backup\.mdx$/,
  /-old\.mdx$/,
  /\.backup\.mdx$/,
];

function getAllArticles() {
  const files = fs.readdirSync(ARTICLES_DIR);

  const articles = files
    .filter(file => file.endsWith('.mdx'))
    .filter(file => !EXCLUDE_PATTERNS.some(pattern => pattern.test(file)))
    .map(file => file.replace('.mdx', ''));

  return articles;
}

function main() {
  console.log('🚀 Optifai記事のZenn変換を開始します...\n');

  const articles = getAllArticles();
  console.log(`📚 対象記事数: ${articles.length}記事\n`);

  const results = {
    success: [],
    failed: [],
  };

  articles.forEach((slug, index) => {
    try {
      console.log(`[${index + 1}/${articles.length}] ${slug}`);
      convertArticle(slug, OUTPUT_DIR);
      results.success.push(slug);
    } catch (error) {
      console.error(`❌ エラー: ${error.message}`);
      results.failed.push({ slug, error: error.message });
    }
    console.log('');
  });

  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 変換結果サマリー');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${results.success.length}記事`);
  console.log(`❌ 失敗: ${results.failed.length}記事`);
  console.log('='.repeat(60));

  if (results.failed.length > 0) {
    console.log('\n⚠️  変換失敗した記事:');
    results.failed.forEach(({ slug, error }) => {
      console.log(`  - ${slug}: ${error}`);
    });
  }

  console.log('\n✨ 変換完了！');
  console.log(`\n👉 プレビューを確認: http://localhost:8000`);
  console.log(`📁 出力ディレクトリ: ${OUTPUT_DIR}`);

  // 変換結果を記録
  const reportPath = './conversion-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📝 変換レポート: ${reportPath}`);
}

main();
