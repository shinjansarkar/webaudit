async function analyzeWebsite() {
    const urlInput = document.getElementById('urlInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingSection = document.getElementById('loadingSection');
    const errorSection = document.getElementById('errorSection');
    const resultsSection = document.getElementById('resultsSection');

    const url = urlInput.value.trim();
    const maxPages = parseInt(document.getElementById('maxPagesInput').value) || 20;

    if (!url) {
        showError('Please enter a valid URL');
        return;
    }

    // Reset UI
    errorSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.querySelector('.btn-text').classList.add('hidden');
    analyzeBtn.querySelector('.btn-loader').classList.remove('hidden');

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url, max_pages: maxPages })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze website');
        }

        displayResults(data);

    } catch (error) {
        showError(error.message);
    } finally {
        loadingSection.classList.add('hidden');
        analyzeBtn.disabled = false;
        analyzeBtn.querySelector('.btn-text').classList.remove('hidden');
        analyzeBtn.querySelector('.btn-loader').classList.add('hidden');
    }
}

function showError(message) {
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');

    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
}

function getScoreClass(score) {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
}

function displayOverallSummary(data) {
    const overallScores = document.getElementById('overallScores');

    const scores = [
        { name: 'Security', score: data.security?.score || 0 },
        { name: 'SEO', score: data.seo?.score || 0 },
        { name: 'Access', score: data.accessibility?.score || 0 },
        { name: 'Render', score: data.rendering?.score || 0 },
        { name: 'Mobile', score: data.mobile?.score || 0 }
    ];

    // Calculate overall average
    const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length);
    scores.unshift({ name: 'Overall', score: avgScore });

    overallScores.innerHTML = scores.map(item => {
        const strokeDasharray = 264;
        const strokeDashoffset = Math.max(0, 264 - (item.score / 100) * 264);
        
        let colorClass = 'text-primary';
        if (item.score < 50) colorClass = 'text-error';
        else if (item.score < 80) colorClass = 'text-tertiary-dim';
        else if (item.score >= 90) colorClass = 'text-secondary';
        
        return `
        <div class="flex flex-col items-center gap-3">
            <div class="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90">
                    <circle class="text-surface-container-highest" cx="50%" cy="50%" fill="transparent" r="40%" stroke="currentColor" stroke-width="3"></circle>
                    <circle class="${colorClass}" cx="50%" cy="50%" fill="transparent" r="40%" stroke="currentColor" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" stroke-width="3" style="transition: stroke-dashoffset 1.5s ease-out;"></circle>
                </svg>
                <span class="absolute text-xl font-bold">${item.score}</span>
            </div>
            <span class="text-[10px] sm:text-xs uppercase tracking-widest text-on-surface-variant font-medium text-center">${item.name}</span>
        </div>
        `;
    }).join('');

    // Update the blurb text
    const blurb = document.getElementById('summaryBlurb');
    blurb.innerHTML = `<span class="${avgScore >= 70 ? 'text-secondary' : 'text-error'} font-semibold">Overall ${avgScore >= 70 ? 'Healthy' : 'Needs Attention'}</span> &middot; Full scan complete`;
}

function displayResults(data) {
    const resultsSection = document.getElementById('resultsSection');

    // Update header
    document.getElementById('analyzedUrl').innerHTML = `<a href="${data.url}" class="hover:underline" target="_blank">${data.url}</a>`;
    document.getElementById('timestamp').textContent = `Last run: ${data.timestamp}`;

    // Crawl summary text
    const pageCount = data.pages_crawled || 1;
    document.getElementById('crawlSummary').innerHTML =
        `Analyzed ${pageCount} page${pageCount !== 1 ? 's' : ''}`;

    // Crawled pages card
    const crawledCard = document.getElementById('crawledPagesCard');
    const pagesCount = document.getElementById('pagesCount');
    const crawledBody = document.getElementById('crawledPagesBody');
    if (data.per_page_summary && data.per_page_summary.length > 0) {
        crawledCard.classList.remove('hidden');
        pagesCount.textContent = `${data.per_page_summary.length} Total`;
        crawledBody.innerHTML = data.per_page_summary.map(p => {
            const short = p.url.replace(/^https?:\/\/[^/]+/, '') || '/';
            return `<tr class="hover:bg-surface-bright transition-colors group">
                <td class="px-6 py-4 font-mono text-primary-dim"><a href="${p.url}" target="_blank" title="${p.url}">${short || p.url}</a></td>
                <td class="px-6 py-4"><span class="mini-score ${getScoreClass(p.seo_score)} px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm inline-block w-8 text-center">${p.seo_score}</span></td>
                <td class="px-6 py-4"><span class="mini-score ${getScoreClass(p.perf_score)} px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm inline-block w-8 text-center">${p.perf_score}</span></td>
                <td class="px-6 py-4"><span class="mini-score ${getScoreClass(p.acc_score)} px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm inline-block w-8 text-center">${p.acc_score}</span></td>
                <td class="px-6 py-4"><span class="mini-score ${getScoreClass(p.mob_score)} px-2 py-0.5 rounded text-xs font-bold text-white shadow-sm inline-block w-8 text-center">${p.mob_score}</span></td>
                <td class="px-6 py-4 ${p.broken_count > 0 ? 'text-error' : 'text-on-surface-variant'}">${p.broken_count} broken</td>
            </tr>`;
        }).join('');
    } else {
        crawledCard.classList.add('hidden');
    }

    // Display overall summary
    displayOverallSummary(data);

    // Display security results
    displaySecurity(data.security);

    // Display broken links
    displayBrokenLinks(data.broken_links);

    // Display performance
    displayPerformance(data.performance);

    // Display rendering
    displayRendering(data.rendering);

    // Display improvements
    displayImprovements(data.improvements);

    // Display SEO
    displaySEO(data.seo);

    // Display Accessibility
    displayAccessibility(data.accessibility);

    // Display Mobile Optimization
    displayMobile(data.mobile);

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function displaySecurity(security) {
    const securityScore = document.getElementById('securityScore');
    const securityPassed = document.getElementById('securityPassed');
    const securityIssues = document.getElementById('securityIssues');

    // Display score
    const score = security.score || 0;
    securityScore.textContent = `Score: ${score}/100`;

    // Display passed checks
    if (security.passed && security.passed.length > 0) {
        securityPassed.innerHTML = security.passed.map(item => `
                <div class="passed-item">${item}</div>
            `).join('');
    } else {
        securityPassed.innerHTML = '';
    }

    // Display issues
    if (security.issues && security.issues.length > 0) {
        securityIssues.innerHTML = security.issues.map(issue => `
                <div class="issue-item ${issue.severity}">
                    <span class="issue-severity severity-${issue.severity}">${issue.severity}</span>
                    <div class="issue-title">${issue.issue}</div>
                    <div class="issue-description">${issue.description}</div>
                </div>
            `).join('');
    } else {
        securityIssues.innerHTML = '<div class="passed-item">No security issues found!</div>';
    }
}

function displayBrokenLinks(brokenLinks) {
    const brokenLinksCount = document.getElementById('brokenLinksCount');
    const linksStats = document.getElementById('linksStats');
    const brokenLinksList = document.getElementById('brokenLinksList');

    const brokenCount = brokenLinks.broken_count || 0;
    const workingCount = brokenLinks.working_count || 0;
    const totalChecked = brokenLinks.total_checked || 0;

    brokenLinksCount.textContent = `${brokenCount} broken`;

    // Display stats
    linksStats.innerHTML = `
        <div class="bg-surface-container-low p-3 flex flex-col items-center justify-center rounded border border-outline/10">
            <span class="text-2xl font-bold text-primary mb-1">${totalChecked}</span>
            <span class="text-[9px] uppercase tracking-widest text-on-surface-variant text-center">Checked</span>
        </div>
        <div class="bg-surface-container-low p-3 flex flex-col items-center justify-center rounded border border-outline/10">
            <span class="text-2xl font-bold text-tertiary-dim mb-1">${workingCount}</span>
            <span class="text-[9px] uppercase tracking-widest text-on-surface-variant text-center">Working</span>
        </div>
        <div class="bg-surface-container-low p-3 flex flex-col items-center justify-center rounded border border-outline/10">
            <span class="text-2xl font-bold ${brokenCount > 0 ? 'text-error' : 'text-on-surface-variant'} mb-1">${brokenCount}</span>
            <span class="text-[9px] uppercase tracking-widest text-on-surface-variant text-center">Broken</span>
        </div>
    `;

    // Display broken links
    if (brokenLinks.broken && brokenLinks.broken.length > 0) {
        brokenLinksList.innerHTML = brokenLinks.broken.map(link => `
                <div class="broken-link">
                    <div class="broken-link-url">${link.url}</div>
                    <div class="broken-link-status">
                        <span class="status-code">${link.status_code}</span>
                        <span class="status-reason">${link.reason}</span>
                    </div>
                    ${link.found_on ? `<div class="broken-link-found">Found on: <a href="${link.found_on}" target="_blank">${link.found_on.replace(/^https?:\/\/[^/]+/, '') || '/'}</a></div>` : ''}
                </div>
            `).join('');
    } else {
        brokenLinksList.innerHTML = '<div class="passed-item">No broken links found! All links are working properly.</div>';
    }
}

function displayPerformance(performance) {
    const performanceMetrics = document.getElementById('performanceMetrics');
    const performanceGood = document.getElementById('performanceGood');
    const performanceIssues = document.getElementById('performanceIssues');

    // Display metrics
    performanceMetrics.innerHTML = `
        <div class="flex items-center justify-between border-b border-outline/10 pb-3">
            <span class="text-xs uppercase tracking-widest text-on-surface-variant">Avg Load Time</span>
            <span class="text-2xl font-bold text-primary-fixed">${performance.load_time || 'N/A'}</span>
        </div>
        <div class="flex items-center justify-between pt-1">
            <span class="text-xs uppercase tracking-widest text-on-surface-variant">Avg Page Size</span>
            <span class="text-2xl font-bold text-primary-fixed">${performance.page_size || 'N/A'}</span>
        </div>
    `;

    // Display good performance items
    if (performance.good && performance.good.length > 0) {
        performanceGood.innerHTML = performance.good.map(item => `
                <div class="passed-item">${item}</div>
            `).join('');
    } else {
        performanceGood.innerHTML = '';
    }

    // Display issues
    if (performance.issues && performance.issues.length > 0) {
        performanceIssues.innerHTML = performance.issues.map(issue => `
                <div class="issue-item">
                    <div class="issue-title">${issue.issue}</div>
                    <div class="issue-description">${issue.description}</div>
                    ${issue.value !== 'N/A' ? `<div class="mt-1 text-xs text-primary-dim font-bold font-mono">Current: ${issue.value}</div>` : ''}
                </div>
            `).join('');
    } else {
        performanceIssues.innerHTML = '<div class="passed-item">No performance issues found!</div>';
    }
}

function displayImprovements(improvements) {
    const improvementsCount = document.getElementById('improvementsCount');
    const improvementsList = document.getElementById('improvementsList');

    const count = improvements.total_count || 0;
    improvementsCount.textContent = `${count} suggestions`;

    if (improvements.suggestions && improvements.suggestions.length > 0) {
        improvementsList.innerHTML = improvements.suggestions.map(item => `
            <div class="improvement-item">
                <div class="improvement-header">
                    <span class="improvement-category">${item.category}</span>
                    <span class="improvement-priority priority-${item.priority}">${item.priority} priority</span>
                </div>
                <div class="improvement-title">${item.suggestion}</div>
                <div class="improvement-description">${item.description}</div>
            </div>
        `).join('');
    } else {
        improvementsList.innerHTML = '<div class="passed-item">No improvements needed! Your website is in great shape. 🌟</div>';
    }
}

function displaySEO(seo) {
    const seoScore = document.getElementById('seoScore');
    const seoGood = document.getElementById('seoGood');
    const seoIssues = document.getElementById('seoIssues');

    const score = seo.score || 0;
    seoScore.textContent = `Score: ${score}/100`;

    if (seo.good && seo.good.length > 0) {
        seoGood.innerHTML = seo.good.map(item => `
                <div class="passed-item">${item}</div>
            `).join('');
    } else {
        seoGood.innerHTML = '';
    }

    if (seo.issues && seo.issues.length > 0) {
        seoIssues.innerHTML = seo.issues.map(issue => `
                <div class="issue-item">
                    <div class="issue-title">${issue.issue}</div>
                    <div class="issue-description">${issue.description}</div>
                </div>
            `).join('');
    } else {
        seoIssues.innerHTML = '<div class="passed-item">Excellent SEO! No issues found.</div>';
    }
}

function displayAccessibility(accessibility) {
    const accessibilityScore = document.getElementById('accessibilityScore');
    const accessibilityGood = document.getElementById('accessibilityGood');
    const accessibilityIssues = document.getElementById('accessibilityIssues');

    const score = accessibility.score || 0;
    accessibilityScore.textContent = `Score: ${score}/100`;

    if (accessibility.good && accessibility.good.length > 0) {
        accessibilityGood.innerHTML = accessibility.good.map(item => `
                <div class="passed-item">${item}</div>
            `).join('');
    } else {
        accessibilityGood.innerHTML = '';
    }

    if (accessibility.issues && accessibility.issues.length > 0) {
        accessibilityIssues.innerHTML = accessibility.issues.map(issue => `
                <div class="issue-item">
                    <div class="issue-title">${issue.issue}</div>
                    <div class="issue-description">${issue.description}</div>
                </div>
            `).join('');
    } else {
        accessibilityIssues.innerHTML = '<div class="passed-item">Fully accessible!</div>';
    }
}

function displayMobile(mobile) {
    const mobileScore = document.getElementById('mobileScore');
    const mobileGood = document.getElementById('mobileGood');
    const mobileIssues = document.getElementById('mobileIssues');

    const score = mobile.score || 0;
    mobileScore.textContent = `Score: ${score}/100`;

    if (mobile.good && mobile.good.length > 0) {
        mobileGood.innerHTML = mobile.good.map(item => `
                <div class="passed-item">${item}</div>
            `).join('');
    } else {
        mobileGood.innerHTML = '';
    }

    if (mobile.issues && mobile.issues.length > 0) {
        mobileIssues.innerHTML = mobile.issues.map(issue => `
                <div class="issue-item">
                    <div class="issue-title">${issue.issue}</div>
                    <div class="issue-description">${issue.description}</div>
                </div>
            `).join('');
    } else {
        mobileIssues.innerHTML = '<div class="passed-item">Optimized for mobile.</div>';
    }
}

function displayRendering(rendering) {
    const renderingScore = document.getElementById('renderingScore');
    const renderingGood = document.getElementById('renderingGood');
    const renderingIssues = document.getElementById('renderingIssues');

    if (!rendering) {
        renderingScore.textContent = 'N/A';
        renderingGood.innerHTML = '';
        renderingIssues.innerHTML = '<div class="issue-item">Rendering analysis not available</div>';
        return;
    }

    const score = rendering.score || 0;
    renderingScore.textContent = `Score: ${score}/100`;

    if (rendering.good && rendering.good.length > 0) {
        renderingGood.innerHTML = rendering.good.map(item => `
                <div class="passed-item">${item}</div>
            `).join('');
    } else {
        renderingGood.innerHTML = '';
    }

    if (rendering.issues && rendering.issues.length > 0) {
        renderingIssues.innerHTML = rendering.issues.map(issue => `
                <div class="issue-item ${issue.severity || ''}">
                    ${issue.severity ? `<span class="issue-severity severity-${issue.severity}">${issue.severity}</span>` : ''}
                    <div class="issue-title">${issue.issue}</div>
                    <div class="issue-description">${issue.description}</div>
                </div>
            `).join('');
    } else {
        renderingIssues.innerHTML = '<div class="passed-item">No rendering issues found!</div>';
    }
}

function exportToPdf() {
    // Add print-specific class to body
    document.body.classList.add('printing');

    // Get the analyzed URL for the filename
    const urlElement = document.getElementById('analyzedUrl');
    const analyzedUrl = urlElement ? urlElement.textContent.replace('URL: ', '').trim() : 'website';
    const sanitizedUrl = analyzedUrl.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);

    // Store original title
    const originalTitle = document.title;

    // Set document title for PDF filename
    document.title = `Web_Analysis_Report_${sanitizedUrl}`;

    // Trigger print dialog
    window.print();

    // Restore original title after print dialog
    setTimeout(() => {
        document.title = originalTitle;
        document.body.classList.remove('printing');
    }, 1000);
}

// Allow Enter key to trigger analysis
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('urlInput').addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            analyzeWebsite();
        }
    });
});
