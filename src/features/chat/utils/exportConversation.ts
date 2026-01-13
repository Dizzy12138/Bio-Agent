import type { Message, Conversation } from '../../../types';

/**
 * 将对话导出为 Markdown 格式
 */
export function exportConversationToMarkdown(
    conversation: Conversation,
    messages: Message[]
): string {
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('zh-CN');
    };

    const expertInfo = conversation.expertName
        ? `\n- **专家**: ${conversation.expertAvatar || '🤖'} ${conversation.expertName}`
        : '';

    let markdown = `# ${conversation.title}

## 对话信息
- **创建时间**: ${formatTime(conversation.createdAt)}
- **更新时间**: ${formatTime(conversation.updatedAt)}${expertInfo}
- **消息数量**: ${messages.length}

---

## 对话内容

`;

    messages.forEach((msg, index) => {
        const roleLabel = msg.role === 'user' ? '👤 用户' :
            msg.expertName ? `${msg.expertAvatar || '🤖'} ${msg.expertName}` : '🤖 助手';
        const time = formatTime(msg.timestamp);

        markdown += `### ${roleLabel}
*${time}*

${msg.content}

`;

        // 如果有工具调用，添加
        if (msg.metadata?.toolCalls && msg.metadata.toolCalls.length > 0) {
            markdown += `<details>
<summary>🔧 工具调用</summary>

${msg.metadata.toolCalls.map(tc => `- **${tc.name}**: ${tc.status}`).join('\n')}

</details>

`;
        }

        // 如果有引用，添加
        if (msg.metadata?.citations && msg.metadata.citations.length > 0) {
            markdown += `<details>
<summary>📚 参考引用</summary>

${msg.metadata.citations.map((c, i) => `${i + 1}. [${c.title}](${c.url})`).join('\n')}

</details>

`;
        }

        if (index < messages.length - 1) {
            markdown += `---

`;
        }
    });

    markdown += `
---

*由 BioMed Agent 导出于 ${new Date().toLocaleString('zh-CN')}*
`;

    return markdown;
}

/**
 * 将对话导出为纯文本格式
 */
export function exportConversationToText(
    conversation: Conversation,
    messages: Message[]
): string {
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('zh-CN');
    };

    let text = `${conversation.title}
${'='.repeat(50)}

对话信息:
- 创建时间: ${formatTime(conversation.createdAt)}
- 消息数量: ${messages.length}
${conversation.expertName ? `- 专家: ${conversation.expertName}` : ''}

${'='.repeat(50)}

`;

    messages.forEach((msg) => {
        const roleLabel = msg.role === 'user' ? '用户' :
            msg.expertName || '助手';
        const time = formatTime(msg.timestamp);

        text += `[${roleLabel}] ${time}
${'-'.repeat(30)}
${msg.content}

`;
    });

    text += `${'='.repeat(50)}
导出时间: ${new Date().toLocaleString('zh-CN')}
`;

    return text;
}

/**
 * 将对话导出为 JSON 格式（用于备份/迁移）
 */
export function exportConversationToJSON(
    conversation: Conversation,
    messages: Message[]
): string {
    const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        conversation: {
            id: conversation.id,
            title: conversation.title,
            expertId: conversation.expertId,
            expertName: conversation.expertName,
            expertAvatar: conversation.expertAvatar,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
        },
        messages: messages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            expertId: msg.expertId,
            expertName: msg.expertName,
            expertAvatar: msg.expertAvatar,
        })),
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * 生成 HTML 格式（可转换为 PDF）
 */
export function exportConversationToHTML(
    conversation: Conversation,
    messages: Message[]
): string {
    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('zh-CN');
    };

    const expertInfo = conversation.expertName
        ? `<p><strong>专家:</strong> ${conversation.expertAvatar || '🤖'} ${conversation.expertName}</p>`
        : '';

    let messagesHtml = '';
    messages.forEach((msg) => {
        const isUser = msg.role === 'user';
        const roleLabel = isUser ? '👤 用户' :
            msg.expertName ? `${msg.expertAvatar || '🤖'} ${msg.expertName}` : '🤖 助手';
        const bubbleClass = isUser ? 'user-bubble' : 'assistant-bubble';

        messagesHtml += `
            <div class="message ${bubbleClass}">
                <div class="message-header">
                    <span class="role">${roleLabel}</span>
                    <span class="time">${formatTime(msg.timestamp)}</span>
                </div>
                <div class="message-content">${msg.content.replace(/\n/g, '<br>')}</div>
            </div>
        `;
    });

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${conversation.title} - BioMed Agent</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4caf50, #45a049);
            color: white;
            padding: 24px;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 12px;
        }
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        .messages {
            padding: 20px;
        }
        .message {
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 12px;
        }
        .user-bubble {
            background: #e3f2fd;
            margin-left: 40px;
        }
        .assistant-bubble {
            background: #f5f5f5;
            margin-right: 40px;
        }
        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
        }
        .role {
            font-weight: 600;
        }
        .time {
            color: #666;
        }
        .message-content {
            font-size: 15px;
            white-space: pre-wrap;
        }
        .footer {
            text-align: center;
            padding: 16px;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #eee;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${conversation.title}</h1>
            <p><strong>创建时间:</strong> ${formatTime(conversation.createdAt)}</p>
            ${expertInfo}
            <p><strong>消息数量:</strong> ${messages.length}</p>
        </div>
        <div class="messages">
            ${messagesHtml}
        </div>
        <div class="footer">
            由 BioMed Agent 导出于 ${new Date().toLocaleString('zh-CN')}
        </div>
    </div>
</body>
</html>`;
}

/**
 * 下载对话
 */
export function downloadConversation(
    conversation: Conversation,
    messages: Message[],
    format: 'markdown' | 'text' | 'json' | 'html'
): void {
    let content: string;
    let filename: string;
    let mimeType: string;

    const safeTitle = conversation.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');

    switch (format) {
        case 'markdown':
            content = exportConversationToMarkdown(conversation, messages);
            filename = `${safeTitle}.md`;
            mimeType = 'text/markdown';
            break;
        case 'text':
            content = exportConversationToText(conversation, messages);
            filename = `${safeTitle}.txt`;
            mimeType = 'text/plain';
            break;
        case 'json':
            content = exportConversationToJSON(conversation, messages);
            filename = `${safeTitle}.json`;
            mimeType = 'application/json';
            break;
        case 'html':
            content = exportConversationToHTML(conversation, messages);
            filename = `${safeTitle}.html`;
            mimeType = 'text/html';
            break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
