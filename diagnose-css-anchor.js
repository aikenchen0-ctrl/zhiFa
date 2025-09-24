// CSS Anchor Positioning 自动诊断脚本
// 在浏览器控制台中运行此脚本

function diagnoseCSSAnchor() {
    console.log('🔍 开始CSS Anchor Positioning诊断...');
    
    const results = {
        timestamp: new Date().toISOString(),
        browser: navigator.userAgent,
        support: {},
        elements: {},
        css: {},
        connections: {},
        issues: []
    };
    
    // 1. 检查CSS支持
    console.log('\n1️⃣ 检查CSS Anchor Positioning支持:');
    results.support = {
        anchorName: CSS.supports('anchor-name', '--test'),
        anchorFunction: CSS.supports('left', 'anchor(--test left)'),
        positionAnchor: CSS.supports('position-anchor', '--test'),
        polyfillReady: window.anchorReady
    };
    
    Object.entries(results.support).forEach(([key, value]) => {
        console.log(`  ${key}: ${value ? '✅' : '❌'}`);
    });
    
    if (!results.support.anchorName && !results.support.polyfillReady) {
        results.issues.push('❌ CSS Anchor Positioning不支持且polyfill未就绪');
    }
    
    // 2. 检查锚点元素
    console.log('\n2️⃣ 检查锚点元素:');
    const anchors = {
        conv: document.querySelectorAll('.conv-avatar[data-id]'),
        msg: document.querySelectorAll('.msg-bubble[data-id]'),
        acc: document.querySelectorAll('.acc-avatar[data-id]')
    };
    
    results.elements = {
        convCount: anchors.conv.length,
        msgCount: anchors.msg.length,
        accCount: anchors.acc.length
    };
    
    console.log(`  会话头像: ${anchors.conv.length} 个`);
    console.log(`  消息气泡: ${anchors.msg.length} 个`);
    console.log(`  账号头像: ${anchors.acc.length} 个`);
    
    // 检查前3个元素的详细信息
    [...anchors.conv].slice(0, 3).forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        console.log(`  会话头像${i}: 位置=(${rect.left.toFixed(0)}, ${rect.top.toFixed(0)}), anchorName=${style.anchorName || 'undefined'}`);
    });
    
    // 3. 检查CSS规则
    console.log('\n3️⃣ 检查动态CSS规则:');
    const dynamicStyle = document.getElementById('simple-css');
    results.css = {
        styleExists: !!dynamicStyle,
        styleLength: dynamicStyle?.textContent?.length || 0,
        containsAnchorName: dynamicStyle?.textContent?.includes('anchor-name') || false,
        containsPositionAnchor: dynamicStyle?.textContent?.includes('position-anchor') || false
    };
    
    console.log(`  动态样式存在: ${results.css.styleExists ? '✅' : '❌'}`);
    console.log(`  样式长度: ${results.css.styleLength} 字符`);
    console.log(`  包含anchor-name: ${results.css.containsAnchorName ? '✅' : '❌'}`);
    console.log(`  包含position-anchor: ${results.css.containsPositionAnchor ? '✅' : '❌'}`);
    
    if (dynamicStyle && results.css.styleLength > 0) {
        console.log(`  CSS示例:`, dynamicStyle.textContent.substring(0, 200) + '...');
    }
    
    // 4. 检查连接线元素
    console.log('\n4️⃣ 检查连接线元素:');
    const connections = document.querySelectorAll('.simple-connection');
    results.connections = {
        totalCount: connections.length,
        visibleCount: 0,
        details: []
    };
    
    console.log(`  连接线总数: ${connections.length}`);
    
    connections.forEach((conn, i) => {
        const rect = conn.getBoundingClientRect();
        const style = getComputedStyle(conn);
        const id = conn.getAttribute('data-id');
        
        const isVisible = rect.width > 1 && rect.height > 1;
        const hasPosition = style.left !== 'auto' && style.left !== '0px';
        
        if (isVisible) results.connections.visibleCount++;
        
        const detail = {
            index: i,
            id: id,
            visible: isVisible,
            hasPosition: hasPosition,
            rect: {
                width: rect.width.toFixed(1),
                height: rect.height.toFixed(1),
                left: rect.left.toFixed(1),
                top: rect.top.toFixed(1)
            },
            styles: {
                left: style.left,
                top: style.top,
                width: style.width,
                positionAnchor: style.positionAnchor || 'undefined',
                backgroundColor: style.backgroundColor
            }
        };
        
        results.connections.details.push(detail);
        
        if (i < 3) {
            console.log(`  连接线${i}(id=${id}):`);
            console.log(`    可见: ${isVisible ? '✅' : '❌'}, 定位: ${hasPosition ? '✅' : '❌'}`);
            console.log(`    尺寸: ${detail.rect.width}×${detail.rect.height}`);
            console.log(`    位置: (${detail.rect.left}, ${detail.rect.top})`);
            console.log(`    样式: left=${style.left}, top=${style.top}`);
            console.log(`    锚点: ${style.positionAnchor || 'undefined'}`);
        }
    });
    
    const successRate = connections.length > 0 ? (results.connections.visibleCount / connections.length * 100).toFixed(1) : 0;
    console.log(`  可见连接线: ${results.connections.visibleCount}/${connections.length} (${successRate}%)`);
    
    // 5. 问题分析
    console.log('\n5️⃣ 问题分析:');
    
    if (results.connections.visibleCount === 0) {
        results.issues.push('❌ 所有连接线都不可见');
        
        if (!results.css.styleExists) {
            results.issues.push('❌ 动态CSS样式未生成');
        } else if (!results.css.containsPositionAnchor) {
            results.issues.push('❌ CSS中缺少position-anchor规则');
        }
        
        if (!results.support.anchorName && !results.support.polyfillReady) {
            results.issues.push('❌ CSS Anchor Positioning不支持');
        }
    }
    
    results.issues.forEach(issue => console.log(`  ${issue}`));
    
    // 6. 建议修复方案
    console.log('\n6️⃣ 建议修复方案:');
    
    if (!results.support.anchorName && !results.support.polyfillReady) {
        console.log('  🔧 等待polyfill加载完成或使用支持的浏览器');
    }
    
    if (results.connections.visibleCount === 0 && results.css.styleExists) {
        console.log('  🔧 检查CSS语法错误，可能需要降级到更简单的实现');
    }
    
    if (results.elements.convCount === 0) {
        console.log('  🔧 先点击"生成5个测试"按钮创建元素');
    }
    
    console.log('\n📊 完整诊断结果:');
    console.log(results);
    
    return results;
}

// 运行诊断
diagnoseCSSAnchor();

// 提供快速修复测试函数
window.quickFix = function() {
    console.log('🛠️ 尝试快速修复...');
    
    // 强制设置连接线为可见状态进行测试
    const connections = document.querySelectorAll('.simple-connection');
    connections.forEach((conn, i) => {
        if (i < 3) {
            conn.style.position = 'absolute';
            conn.style.left = '150px';
            conn.style.top = (50 + i * 80) + 'px';
            conn.style.width = '100px';
            conn.style.height = '4px';
            conn.style.backgroundColor = 'red';
            conn.style.zIndex = '999';
            console.log(`强制显示连接线${i}`);
        }
    });
    
    console.log('如果现在能看到红色连接线，说明是CSS Anchor定位问题');
    console.log('如果还是看不到，说明是元素创建或层级问题');
};

console.log('\n💡 使用说明:');
console.log('1. 查看上面的诊断结果');
console.log('2. 如果连接线不可见，运行 quickFix() 进行快速测试');
console.log('3. 将诊断结果告诉开发者进行修复');