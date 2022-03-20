import type { RequestEvent } from '@sveltejs/kit/types/internal';
import { getContent } from '../_utils';

export async function get({ params }: RequestEvent<{ name: string }>) {
	return {
		body: await getContent({ filter: { series: params.name }, sort: 'asc' })
	};
}
