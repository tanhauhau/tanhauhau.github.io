import { getContent } from '../../_utils';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
	return json(await getContent({ filter: { series: params.name }, sort: 'asc' }));
}
