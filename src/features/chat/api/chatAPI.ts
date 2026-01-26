import type { Message } from '../../../types';
import type { Expert } from '../../../constants/experts';

// Real API implementation placeholder
export async function sendMessage(
    content: string,
    expert: Expert | null
): Promise<Message> {
    // Prevent unused variable linter error
    console.debug('API Call Placeholder:', { content, expert });

    // TODO: Implement actual API call
    // const response = await fetch('/api/v1/chat/completions', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //         messages: [{ role: 'user', content }],
    //         expertId: expert?.id
    //     })
    // });
    // return await response.json();

    throw new Error('Real Chat API is not yet implemented.');
}
