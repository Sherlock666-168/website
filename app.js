// app.js - Final corrected version (no explanations)

// Import Supabase utilities
import {
  fetchArticles,
  fetchArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  addComment,
  fetchComments,
  searchArticles
} from './supabase.js';

/***********************************************************************
 * Global State
 ***********************************************************************/
const appState = {
  theme: localStorage.getItem('theme') || 'light'
};

/***********************************************************************
 * Basic UI Setup
 ***********************************************************************/
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => (p.style.display = 'none'));
  const page = document.getElementById(pageId);
  if (page) {
    page.style.display = 'block';
    window.scrollTo(0, 0);
  } else {
    document.getElementById('home-page').style.display = 'block';
  }
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-page') === pageId) {
      link.classList.add('active');
    }
  });
}

function showNotification(message, type) {
  const n = document.getElementById('notification');
  if (!n) return;
  n.textContent = message;
  n.className = 'notification';
  n.classList.add(`notification-${type}`, 'show');
  setTimeout(() => n.classList.remove('show'), 3000);
}

/***********************************************************************
 * Utility Functions
 ***********************************************************************/
function formatDate(ds) {
  const d = new Date(ds);
  return d.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
}

function calculateReadTime(content) {
  const words = (content.match(/\b\w+\b/g) || []).length;
  return `${Math.ceil(words / 200)} min read`;
}

function formatContentAsHtml(content) {
  let html = '';
  const paragraphs = content.split(/\n\n+/);
  paragraphs.forEach(par => {
    const p = par.trim();
    if (!p) return;
    if (p.startsWith('# ')) {
      html += `<h2>${p.slice(2)}</h2>`;
    } else if (p.startsWith('## ')) {
      html += `<h3>${p.slice(3)}</h3>`;
    } else if (p.match(/^\d+\.\s/)) {
      html += '<ol>';
      p.split('\n').forEach(line => {
        const t = line.trim();
        if (t.match(/^\d+\.\s/)) html += `<li>${t.slice(t.indexOf(' ') + 1)}</li>`;
      });
      html += '</ol>';
    } else if (p.startsWith('* ') || p.startsWith('- ')) {
      html += '<ul>';
      p.split('\n').forEach(line => {
        const t = line.trim();
        if (t.startsWith('* ') || t.startsWith('- ')) html += `<li>${t.slice(2)}</li>`;
      });
      html += '</ul>';
    } else if (p.startsWith('>')) {
      html += `<blockquote>${p.slice(1).trim()}</blockquote>`;
    } else {
      html += `<p>${p}</p>`;
    }
  });
  return html;
}

/***********************************************************************
 * Display Articles
 ***********************************************************************/
async function displayArticles() {
  try {
    const featured = document.getElementById('featured-posts-grid');
    if (featured) {
      const published = await fetchArticles('published');
      featured.innerHTML = '';
      if (!published.length) {
        featured.innerHTML = '<p class="no-articles-message">No published articles yet. Create your first article in Publish!</p>';
      } else {
        const sorted = [...published].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
        sorted.forEach(a => {
          const card = document.createElement('article');
          card.className = 'post-card';
          card.innerHTML = `
            <div class="card-image" style="background-image:url('${a.imageUrl}');"></div>
            <div class="card-content">
              <span class="post-category">${a.category}</span>
              <h3 class="post-title">${a.title}</h3>
              <p class="post-excerpt">${a.excerpt}</p>
              <div class="post-meta">
                <span>${formatDate(a.date)}</span>
                <span>${a.readTime || calculateReadTime(a.content)}</span>
              </div>
            </div>
          `;
          card.addEventListener('click', () => {
            loadArticle(a.id);
            navigateTo('blog-post-page');
          });
          featured.appendChild(card);
        });
        setTimeout(() => document.querySelectorAll('.post-card').forEach(c => c.classList.add('fade-in')), 100);
      }
    }

    const allGrid = document.getElementById('all-posts-grid');
    if (allGrid) {
      const published = await fetchArticles('published');
      allGrid.innerHTML = '';
      if (!published.length) {
        allGrid.innerHTML = '<p class="no-articles-message">No published articles yet. Create your first article in Publish!</p>';
      } else {
        const sortedAll = [...published].sort((a, b) => new Date(b.date) - new Date(a.date));
        sortedAll.forEach(a => {
          const card = document.createElement('article');
          card.className = 'post-card';
          card.setAttribute('data-category', a.category);
          card.innerHTML = `
            <div class="card-image" style="background-image:url('${a.imageUrl}')"></div>
            <div class="card-content">
              <span class="post-category">${a.category}</span>
              <h3 class="post-title">${a.title}</h3>
              <p class="post-excerpt">${a.excerpt}</p>
              <div class="post-meta">
                <span>${formatDate(a.date)}</span>
                <span>${a.readTime || calculateReadTime(a.content)}</span>
              </div>
            </div>
          `;
          card.addEventListener('click', () => {
            loadArticle(a.id);
            navigateTo('blog-post-page');
          });
          allGrid.appendChild(card);
        });
      }
    }

    const articlesList = document.getElementById('articles-list');
    if (articlesList) {
      const all = await fetchArticles();
      articlesList.innerHTML = '';
      if (!all.length) {
        articlesList.innerHTML = '<p class="no-articles-message">No articles yet. Create your first article!</p>';
        return;
      }
      all.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'published' ? -1 : 1;
        return new Date(b.date) - new Date(a.date);
      });
      all.forEach(a => {
        const d = formatDate(a.date);
        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
          <div class="article-image" style="background-image:url('${a.imageUrl}')"></div>
          <div class="article-details">
            <span class="article-status status-${a.status}">${a.status === 'published' ? 'Published' : 'Draft'}</span>
            <h3 class="article-title">${a.title}</h3>
            <p class="article-excerpt">${a.excerpt}</p>
            <div class="article-meta">
              ${a.status === 'published' ? `Published on: ${d}` : `Last edited: ${d}`}
            </div>
            <div class="article-actions">
              <button class="article-action-btn edit-btn" data-id="${a.id}">Edit</button>
              ${
                a.status === 'published'
                  ? `<button class="article-action-btn view-btn" data-id="${a.id}">View</button>`
                  : `<button class="article-action-btn publish-btn" data-id="${a.id}">Publish</button>`
              }
              <button class="article-action-btn delete-btn" data-id="${a.id}">Delete</button>
            </div>
          </div>
        `;
        articlesList.appendChild(card);
      });

      document.querySelectorAll('.edit-btn').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
          editArticle(b.getAttribute('data-id'));
        });
      });
      document.querySelectorAll('.view-btn').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
          loadArticle(b.getAttribute('data-id'));
          navigateTo('blog-post-page');
        });
      });
      document.querySelectorAll('.publish-btn').forEach(b => {
        b.addEventListener('click', e => {
          e.stopPropagation();
          publishDraft(b.getAttribute('data-id'));
        });
      });
      document.querySelectorAll('.delete-btn').forEach(b => {
        b.addEventListener('click', async e => {
          e.stopPropagation();
          if (confirm('Are you sure you want to delete this article?')) {
            await deleteArticleHandler(b.getAttribute('data-id'));
          }
        });
      });
    }
  } catch (err) {
    console.error('Error displaying articles:', err);
    showNotification('Failed to load articles', 'error');
  }
}

/***********************************************************************
 * Article Operations
 ***********************************************************************/
async function loadArticle(articleId) {
  try {
    const a = await fetchArticleById(articleId);
    if (!a) {
      showNotification('Article not found', 'error');
      return;
    }
    const bp = document.querySelector('.blog-post');
    if (bp) bp.setAttribute('data-article-id', articleId);
    document.getElementById('post-category').textContent = a.category;
    document.getElementById('post-title').textContent = a.title;
    document.getElementById('post-date').textContent = formatDate(a.date);
    document.getElementById('post-read-time').textContent = a.readTime || calculateReadTime(a.content);
    document.getElementById('post-image').src = a.imageUrl;
    document.getElementById('post-content').innerHTML = a.content;
    const timeline = document.getElementById('ai-agents-timeline');
    if (timeline) timeline.style.display = a.showTimeline ? 'block' : 'none';
    const comments = await fetchComments(articleId);
    loadCommentsUI(comments);
  } catch (err) {
    console.error('Error loading article:', err);
    showNotification('Failed to load article', 'error');
  }
}

function loadCommentsUI(comments) {
  const cList = document.getElementById('comments-list');
  if (!cList) return;
  cList.innerHTML = '';
  if (!comments || !comments.length) {
    cList.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
    return;
  }
  comments.forEach(c => {
    const el = document.createElement('div');
    el.className = 'comment';
    el.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${c.author}</span>
        <span class="comment-date">${formatDate(c.date)}</span>
      </div>
      <div class="comment-content">${c.content}</div>
    `;
    cList.appendChild(el);
  });
}

async function addCommentHandler(articleId) {
  const txt = document.getElementById('comment-text').value.trim();
  if (!txt) {
    showNotification('Please enter a comment', 'error');
    return;
  }
  try {
    const success = await addComment(articleId, { content: txt, author: 'Guest User' });
    if (success) {
      const c = await fetchComments(articleId);
      loadCommentsUI(c);
      document.getElementById('comment-text').value = '';
      showNotification('Comment added successfully', 'success');
    } else {
      showNotification('Failed to add comment', 'error');
    }
  } catch (err) {
    console.error('Error adding comment:', err);
    showNotification('Failed to add comment', 'error');
  }
}

function publishArticleHandler() {
  console.log('Publish button clicked');
  try {
    const t = document.getElementById('article-title').value.trim();
    const cat = document.getElementById('article-category').value;
    const ex = document.getElementById('article-excerpt').value.trim();
    const c = document.getElementById('article-content').value.trim();
    const img = document.getElementById('article-image').value || '/api/placeholder/800/400';
    const aid = document.getElementById('article-id').value;
    if (!t || !cat || !ex || !c) {
      showNotification('Please fill out all required fields', 'error');
      return;
    }
    const words = c.split(/\s+/).length;
    const rt = Math.max(1, Math.ceil(words / 200)) + ' min read';
    const article = {
      id: aid || Date.now().toString(),
      title: t,
      category: cat,
      excerpt: ex,
      content: c,
      imageUrl: img,
      readTime: rt,
      showTimeline: false,
      status: 'published'
    };
    console.log('Publishing article:', article);
    supabase
      .from('articles')
      .insert([article])
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error publishing article:', error);
          showNotification('Error: ' + error.message, 'error');
          return;
        }
        console.log('Article published successfully:', data);
        showNotification('Article published successfully!', 'success');
        document.getElementById('publication-form').reset();
        const dlg = document.getElementById('success-dialog');
        if (dlg) dlg.classList.add('show');
      })
      .catch(err => {
        console.error('Exception publishing article:', err);
        showNotification('Error: ' + err.message, 'error');
      });
  } catch (e) {
    console.error('Error in publish handler:', e);
    showNotification('Error: ' + e.message, 'error');
  }
}

async function publishDraft(id) {
  try {
    const ok = await updateArticle(id, { status: 'published' });
    if (ok) {
      await displayArticles();
      const a = await fetchArticleById(id);
      showPublishSuccessDialog(a);
    } else {
      showNotification('Failed to publish draft', 'error');
    }
  } catch (err) {
    console.error('Error publishing draft:', err);
    showNotification('Failed to publish draft', 'error');
  }
}

async function deleteArticleHandler(id) {
  try {
    const ok = await deleteArticle(id);
    if (ok) {
      await displayArticles();
      showNotification('Article deleted successfully', 'success');
    } else {
      showNotification('Failed to delete article', 'error');
    }
  } catch (err) {
    console.error('Error deleting article:', err);
    showNotification('Failed to delete article', 'error');
  }
}

async function editArticle(id) {
  try {
    const a = await fetchArticleById(id);
    if (!a) {
      showNotification('Article not found', 'error');
      return;
    }
    document.querySelector('[data-tab="new-article"]').click();
    document.getElementById('article-id').value = a.id;
    document.getElementById('article-title').value = a.title;
    document.getElementById('article-category').value = a.category;
    document.getElementById('article-excerpt').value = a.excerpt;
    const cleaned = a.content.replace(/<[^>]*>/g, '');
    document.getElementById('article-content').value = cleaned;
    document.getElementById('article-image').value = a.imageUrl;
    document.getElementById('publish-btn').textContent = 'Update Article';
    document.getElementById('save-draft-btn').textContent = 'Save Changes as Draft';
  } catch (err) {
    console.error('Error editing article:', err);
    showNotification('Failed to load article for editing', 'error');
  }
}

function showPublishSuccessDialog(a) {
  const dlg = document.getElementById('success-dialog');
  if (!dlg) return;
  const vb = document.getElementById('view-article-btn');
  const hb = document.getElementById('go-home-btn');
  const cb = document.getElementById('close-dialog-btn');
  vb.onclick = () => {
    dlg.classList.remove('show');
    loadArticle(a.id);
    navigateTo('blog-post-page');
  };
  hb.onclick = () => {
    dlg.classList.remove('show');
    navigateTo('home-page');
  };
  cb.onclick = () => {
    dlg.classList.remove('show');
    document.querySelector('[data-tab="my-articles"]').click();
  };
  dlg.classList.add('show');
}

function saveDraftHandler() {
  console.log('Save draft button clicked');
  try {
    const t = document.getElementById('article-title').value.trim();
    const cat = document.getElementById('article-category').value;
    const ex = document.getElementById('article-excerpt').value.trim();
    const c = document.getElementById('article-content').value.trim();
    const img = document.getElementById('article-image').value || '/api/placeholder/800/400';
    const aid = document.getElementById('article-id').value;
    if (!t) {
      showNotification('Please enter a title for your article', 'error');
      return;
    }
    const words = c.split(/\s+/).length;
    const rt = Math.max(1, Math.ceil(words / 200)) + ' min read';
    const article = {
      id: aid || Date.now().toString(),
      title: t,
      category: cat || 'Uncategorized',
      excerpt: ex || '',
      content: c || '',
      imageUrl: img,
      readTime: rt,
      showTimeline: false,
      status: 'draft'
    };
    console.log('Saving draft:', article);
    supabase
      .from('articles')
      .insert([article])
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error('Error saving draft:', error);
          showNotification('Error: ' + error.message, 'error');
          return;
        }
        console.log('Draft saved successfully:', data);
        showNotification('Draft saved successfully!', 'success');
      })
      .catch(err => {
        console.error('Exception saving draft:', err);
        showNotification('Error: ' + err.message, 'error');
      });
  } catch (e) {
    console.error('Error in save draft handler:', e);
    showNotification('Error: ' + e.message, 'error');
  }
}

async function updateArticleHandler() {
  try {
    const aid = document.getElementById('article-id').value;
    if (!aid) {
      await publishArticleHandler();
      return;
    }
    const t = document.getElementById('article-title').value.trim();
    const cat = document.getElementById('article-category').value;
    const ex = document.getElementById('article-excerpt').value.trim();
    const c = document.getElementById('article-content').value.trim();
    const img = document.getElementById('article-image').value || '/api/placeholder/800/400';
    if (!t || !cat || !ex || !c) {
      showNotification('Please fill out all required fields', 'error');
      return;
    }
    const rt = calculateReadTime(c);
    const updates = {
      title: t,
      category: cat,
      excerpt: ex,
      content: formatContentAsHtml(c),
      imageUrl: img,
      status: 'published',
      readTime: rt
    };
    const u = await updateArticle(aid, updates);
    if (u) {
      document.getElementById('article-id').value = '';
      document.getElementById('article-title').value = '';
      document.getElementById('article-category').value = '';
      document.getElementById('article-excerpt').value = '';
      document.getElementById('article-content').value = '';
      document.getElementById('article-image').value = '';
      document.getElementById('publish-btn').textContent = 'Publish Article';
      document.getElementById('save-draft-btn').textContent = 'Save as Draft';
      await displayArticles();
      showPublishSuccessDialog(u);
    } else {
      showNotification('Failed to update article', 'error');
    }
  } catch (err) {
    console.error('Error updating article:', err);
    showNotification('Failed to update article', 'error');
  }
}

/***********************************************************************
 * Filters & Search
 ***********************************************************************/
function setupCategoryFilter() {
  const btns = document.querySelectorAll('.filter-btn');
  btns.forEach(b => {
    b.addEventListener('click', () => {
      btns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const cat = b.getAttribute('data-category');
      const cards = document.querySelectorAll('#all-posts-grid .post-card');
      cards.forEach(card => {
        if (cat === 'all' || card.getAttribute('data-category') === cat) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
  document.querySelectorAll('[data-category]').forEach(link => {
    if (link.tagName === 'A') {
      link.addEventListener('click', e => {
        e.preventDefault();
        filterCategory(link.getAttribute('data-category'));
      });
    }
  });
}

function filterCategory(category) {
  navigateTo('blog-list-page');
  setTimeout(() => {
    const fb = document.querySelectorAll('.filter-btn');
    fb.forEach(b => {
      if (b.getAttribute('data-category') === category) b.click();
    });
  }, 100);
}

async function displaySearchResults(results, q) {
  const srList = document.getElementById('search-results-list');
  const sQuery = document.getElementById('search-query');
  if (sQuery) sQuery.textContent = q;
  if (srList) {
    srList.innerHTML = '';
    if (!results.length) {
      srList.innerHTML = '<p>No results found for your search.</p>';
      return;
    }
    results.forEach(a => {
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = `
        <span class="search-result-category">${a.category}</span>
        <h3 class="search-result-title">${a.title}</h3>
        <p class="search-result-excerpt">${a.excerpt}</p>
        <div class="search-result-meta">
          <span>${formatDate(a.date)}</span>
          <span>${a.readTime || calculateReadTime(a.content)}</span>
        </div>
      `;
      div.addEventListener('click', () => {
        loadArticle(a.id);
        navigateTo('blog-post-page');
      });
      srList.appendChild(div);
    });
  }
}

/***********************************************************************
 * Tabs & Animations
 ***********************************************************************/
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const tid = tab.getAttribute('data-tab');
      document.getElementById(`${tid}-content`).classList.add('active');
    });
  });
}

function fadeInOnScroll() {
  const els = document.querySelectorAll('.post-card:not(.fade-in), .category-card:not(.fade-in), .about-content:not(.fade-in)');
  els.forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 100) el.classList.add('fade-in');
  });
}

/***********************************************************************
 * Initialization
 ***********************************************************************/
document.addEventListener('DOMContentLoaded', async () => {
  const body = document.body;
  if (appState.theme === 'dark') {
    body.setAttribute('data-theme', 'dark');
    const tt = document.getElementById('theme-toggle');
    if (tt) tt.innerHTML = '<i class="fas fa-sun"></i>';
  }
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        appState.theme = 'light';
      } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        appState.theme = 'dark';
      }
      localStorage.setItem('theme', appState.theme);
    });
  }

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuClose = document.getElementById('mobile-menu-close');
  if (mobileMenuBtn && mobileMenu && mobileMenuClose) {
    mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.add('active'));
    mobileMenuClose.addEventListener('click', () => mobileMenu.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-link').forEach(l => {
      l.addEventListener('click', () => mobileMenu.classList.remove('active'));
    });
  }

  setupTabs();
  setupCategoryFilter();

  const publishBtn = document.getElementById('publish-btn');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      const aId = document.getElementById('article-id').value;
      if (aId) updateArticleHandler();
      else publishArticleHandler();
    });
  }
  const saveDraftBtn = document.getElementById('save-draft-btn');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', saveDraftHandler);
  }

  navigateTo('home-page');
  await displayArticles();

  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', async e => {
      e.preventDefault();
      const q = document.getElementById('search-input').value.trim();
      if (!q) return;
      try {
        const res = await searchArticles(q);
        displaySearchResults(res, q);
        if (document.getElementById('search-results-page')) navigateTo('search-results-page');
      } catch (err) {
        console.error('Error searching:', err);
        showNotification('Search failed', 'error');
      }
    });
  }

  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', e => {
      e.preventDefault();
      showNotification('Thank you for subscribing!', 'success');
      newsletterForm.reset();
    });
  }

  const commentSubmit = document.getElementById('comment-submit');
  if (commentSubmit) {
    commentSubmit.addEventListener('click', () => {
      const aId = document.querySelector('.blog-post').getAttribute('data-article-id');
      if (aId) addCommentHandler(aId);
    });
  }

  window.addEventListener('scroll', fadeInOnScroll);
  fadeInOnScroll();
});
