export default function ldJsonScript(object: any) {
	return `<script type="application/ld+json">${JSON.stringify(object)}</script>`;
}
