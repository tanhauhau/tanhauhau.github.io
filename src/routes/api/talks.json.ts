import { getContent } from './_utils';

export async function get() {
	return {
		body: await getContent({ filter: { label: ['talk'] } })
	};
}
