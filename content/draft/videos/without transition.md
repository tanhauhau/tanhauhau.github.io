
<script>
	import { fade, blur, fly, slide, scale } from 'svelte/transition';
	import { tick } from 'svelte/internal';
	const data = [
		{ title: 'Hall', items: ['Sweep the floor', 'Mop the floor', 'Throw the rubbish'] },
		{ title: 'Kitchen', items: ['Wash the plates', 'Tidy the table', 'Boil the soup'] },
		{ title: 'Toilet', items: ['Brush the sink', 'Flush the toilet', 'Scrub the floors'] },
	]
	let lists = [{ show: true, shown: true, items: [0, 1] }, { show: false, items: [0] }, { show: false, items: [0, 1] }];
	function toggleShown(node, list) {
		setTimeout(() => {list.shown = true;});
		return {
			destroy() {
				console.log(list);
				list.shown = false;
			}
		}
	}
</script>

<div class="container">
	{#each lists as list, i (i)}
		{#if list.show}
			<div in:fade class="list">
				<div class="title">{data[i].title}</div>
				<button class="close" on:click={() => {
					list.show = false;
					list.shown = false;
				}}>X</button>
				<ul class="items">
					{#each list.items as item,idx (item)}
						<li in:fly={{ x:30, delay: !list.shown ? idx*400+200 : 0 }} out:blur|local class="item" 
								on:click={() => {
								list.items = list.items.filter(i => i !== item);
						}}>
							<span>{data[i].items[item]}</span>
							<span>X</span></li>
					{/each}
					{#if list.items.length !== 3}
						<li in:slide={{delay: list.shown ? 450 : list.items.length * 400 + 200}} out:slide|local class="add-item" on:click={() => {
							const potential = new Set([0,1,2]);
							list.items.forEach(item => potential.delete(item));
							list.items.push(Array.from(potential)[0]);
							list.items = list.items
						}}>Add item</li>
					{/if}
				</ul>
			</div>
		{:else}
			<div class="add-list" on:click={async () => {
				list.show = true
				await tick();
				list.shown = true;
			}}>
				+
			</div>
		{/if}
	{/each}
</div>

<style>
	.container {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
	}
	.list, .add-list {
		margin: 20px;
		border: 1px solid #999;
		border-radius: 4px;
		padding: 20px;
		box-shadow: 4px 4px 4px #ddd;
		position: relative;
	}
	.title {
		font-size: 18px;
		font-weight: bold;
	}
	.close {
		position: absolute;
		top: 10px;
		right: 10px;
		background: none;
		border: none;
		cursor: pointer;
	}
	.items {
		list-style: none;
		padding: 0;
		height: 250px;
	}
	.items li {
		margin-bottom: 16px;
		padding: 8px;
		border: 1px solid #999;
		border-radius: 4px;
		box-shadow: 2px 2px 2px #ddd;
		transition: all 0.5s ease;
		cursor: pointer;
	}
	.items li:hover {
		box-shadow: 4px 4px 4px #ddd;
	}
	.item {
		display: flex;
	}
	.item span:first-child {
		flex: 1;
	}
	.add-list {
		display: grid;
		place-items: center;
		font-size: 100px;
		cursor: pointer;
		background: rgba(0, 0, 255, 0.05);
		color: blue;
		border: none;
		box-shadow: none;
	}
	.items li.add-item {
		border: none;
		background: none;
		box-shadow: none;
		color: blue;
		text-align: center;
		background: rgba(0, 0, 255, 0.05);
	}
</style>