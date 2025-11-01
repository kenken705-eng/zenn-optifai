#!/usr/bin/env node

/**
 * Optifai MDX記事をZenn Markdown形式に変換
 *
 * 使い方:
 *   node convert-article.js <article-slug>
 *   node convert-article.js best-crm-small-teams-2025
 */

const fs = require('fs');
const path = require('path');

// カテゴリーからemojiとtypeを決定
const categoryMap = {
  'tool-lists': { emoji: '🛠️', type: 'tech' },
  'case-study': { emoji: '📊', type: 'idea' },
  'how-to': { emoji: '📝', type: 'tech' },
  'methodology': { emoji: '🔬', type: 'tech' },
  'thought-leadership': { emoji: '💡', type: 'idea' },
  'industry-report': { emoji: '📈', type: 'idea' },
};

// タグをZenn用に変換（最大5つ）
function convertTags(tags) {
  const zennTags = tags
    .map(tag => tag.toLowerCase().replace(/\s+/g, '-'))
    .slice(0, 5);

  // 基本タグを追加
  const baseTags = ['sales', 'crm', 'b2b'];
  const combined = [...new Set([...zennTags, ...baseTags])].slice(0, 5);

  return combined;
}

// フロントマターをパース
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) {
    throw new Error('フロントマターが見つかりません');
  }

  const frontmatter = {};
  const lines = match[1].split('\n');

  let currentKey = null;
  let isArray = false;

  for (const line of lines) {
    if (line.match(/^(\w+):/)) {
      const [, key, value] = line.match(/^(\w+):\s*(.*)$/);
      currentKey = key;

      if (value === '' || value === '[' || value.startsWith('[')) {
        isArray = true;
        frontmatter[key] = [];
        if (value.includes(']')) {
          // インライン配列
          const arrayMatch = value.match(/\[(.*)\]/);
          if (arrayMatch) {
            frontmatter[key] = arrayMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
          }
          isArray = false;
        }
      } else {
        frontmatter[key] = value.replace(/['"]/g, '');
        isArray = false;
      }
    } else if (isArray && line.trim().startsWith('-')) {
      const value = line.trim().substring(1).trim().replace(/['"]/g, '');
      frontmatter[currentKey].push(value);
    } else if (line.trim() === ']') {
      isArray = false;
    }
  }

  return { frontmatter, bodyStart: match[0].length };
}

// Reactコンポーネントを通常のMarkdownに変換
function convertReactComponents(content) {
  let converted = content;

  // HTML entitiesをデコード
  converted = converted.replace(/&lt;/g, '<');
  converted = converted.replace(/&gt;/g, '>');
  converted = converted.replace(/&amp;/g, '&');
  converted = converted.replace(/&quot;/g, '"');
  converted = converted.replace(/&#39;/g, "'");

  // import文を削除
  converted = converted.replace(/^import .+ from .+$/gm, '');

  // <KeyPoints>を:::message形式に変換
  converted = converted.replace(
    /<KeyPoints title="([^"]+)">\n([\s\S]+?)<\/KeyPoints>/g,
    (match, title, content) => {
      return `:::message\n**${title}**\n\n${content}\n:::`;
    }
  );

  // <Callout>を:::message alert形式に変換
  converted = converted.replace(
    /<Callout type="(\w+)">\n([\s\S]+?)<\/Callout>/g,
    (match, type, content) => {
      const alertType = type === 'warning' ? 'alert' : 'message';
      return `:::${alertType}\n${content}\n:::`;
    }
  );

  // <Stats>を表に変換（簡易版）
  converted = converted.replace(
    /<Stats>\n([\s\S]+?)<\/Stats>/g,
    (match, content) => {
      return `\n${content}\n`;
    }
  );

  // その他のReactコンポーネントタグを削除
  converted = converted.replace(/<[A-Z]\w+[^>]*>/g, '');
  converted = converted.replace(/<\/[A-Z]\w+>/g, '');

  // 空行を整理
  converted = converted.replace(/\n{3,}/g, '\n\n');

  return converted.trim();
}

// メイン処理
function convertArticle(slug, outputDir = './articles') {
  const sourcePath = path.join(
    '/home/user2025/projects/Optifai-App/src/app/media/content/articles',
    `${slug}.mdx`
  );

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ 記事が見つかりません: ${sourcePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(sourcePath, 'utf-8');
  const { frontmatter, bodyStart } = parseFrontmatter(content);

  // Zenn用のフロントマターを作成
  const categoryInfo = categoryMap[frontmatter.category] || { emoji: '📝', type: 'tech' };
  const topics = convertTags(frontmatter.tags || []);
  const canonicalUrl = `https://optif.ai/media/articles/${slug}`;

  const zennFrontmatter = {
    title: frontmatter.title,
    emoji: categoryInfo.emoji,
    type: categoryInfo.type,
    topics: topics,
    published: frontmatter.draft === 'false' || frontmatter.draft === false,
    canonical: canonicalUrl,
  };

  // 本文を変換
  const body = content.substring(bodyStart).trim();
  const convertedBody = convertReactComponents(body);

  // Zenn形式のMarkdownを生成
  const zennContent = `---
title: "${zennFrontmatter.title}"
emoji: "${zennFrontmatter.emoji}"
type: "${zennFrontmatter.type}"
topics: [${zennFrontmatter.topics.map(t => `"${t}"`).join(', ')}]
published: ${zennFrontmatter.published}
canonical: ${zennFrontmatter.canonical}
---

${convertedBody}
`;

  // 出力
  const outputPath = path.join(outputDir, `${slug}.md`);
  fs.writeFileSync(outputPath, zennContent);

  console.log(`✅ 変換完了: ${slug}`);
  console.log(`   出力先: ${outputPath}`);
  console.log(`   タイトル: ${zennFrontmatter.title}`);
  console.log(`   トピック: ${topics.join(', ')}`);
  console.log(`   カノニカルURL: ${canonicalUrl}`);

  return outputPath;
}

// コマンドライン引数から実行
if (require.main === module) {
  const slug = process.argv[2];

  if (!slug) {
    console.error('使い方: node convert-article.js <article-slug>');
    console.error('例: node convert-article.js best-crm-small-teams-2025');
    process.exit(1);
  }

  convertArticle(slug);
}

module.exports = { convertArticle };
