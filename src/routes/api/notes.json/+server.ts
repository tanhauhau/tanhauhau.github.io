import { json } from '@sveltejs/kit';
import { getContent } from '../_utils';

export async function GET() {
	return json(await getContent({ filter: { label: ['note'] } }))
}
