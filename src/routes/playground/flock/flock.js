export default function flock(canvas) {
	const ctx = canvas.getContext('2d');

	const width = document.body.clientWidth;
	const height = document.body.clientHeight;
	canvas.height = height;
	canvas.width = width;
	const totalBirds = 500;
	const numNeighbourToConsider = 10;
	const birdSize = 2;
	const separationFactor = birdSize * 5;
	const coherenceFactor = 8;
	const birds = [];
	for (let i = 0; i < totalBirds; i++) {
		birds[i] = {
			x: rand(width),
			y: rand(height),
			vx: 0,
			vy: 0,
			color: `#${hex(rand(256))}${hex(rand(256))}${hex(rand(256))}`
		};
	}

	let frameId;
	function loop() {
		for (const bird of birds) {
			const sorted = nearestNeighboursForBird(bird).slice(1);
			separate(bird, sorted);
			align(bird, sorted);
			cohere(bird, sorted);
			stayInWindow(bird);
		}
		draw(birds);
		frameId = raf(loop);
	}
	frameId = raf(loop);

	function nearestNeighboursForBird(bird) {
		return [...birds].sort((a, b) => {
			const distA = dist(a, bird);
			const distB = dist(b, bird);
			return distA === distB ? 0 : distA > distB ? 1 : -1;
		});
	}

	function separate(bird, sorted) {
		let x = 0;
		let y = 0;
		for (const s of sorted.slice(0, numNeighbourToConsider)) {
			if (dist(s, bird) < separationFactor) {
				x += bird.x - s.x;
				y += bird.y - s.y;
			}
		}
		bird.vx = x;
		bird.vy = y;
		bird.x += x;
		bird.y += y;
	}

	function align(bird, sorted) {
		let x = 0;
		let y = 0;
		for (const s of sorted.slice(0, numNeighbourToConsider)) {
			x += s.vx;
			y += s.vy;
		}
		const dx = x / numNeighbourToConsider;
		const dy = y / numNeighbourToConsider;
		bird.vx += dx;
		bird.vy += dy;
		bird.x += dx;
		bird.y += dy;
	}

	function cohere(bird, sorted) {
		let x = 0;
		let y = 0;
		for (const s of sorted.slice(0, numNeighbourToConsider)) {
			x += s.x;
			y += s.y;
		}
		const dx = (x / numNeighbourToConsider - bird.x) / coherenceFactor;
		const dy = (y / numNeighbourToConsider - bird.y) / coherenceFactor;
		bird.vx += dx;
		bird.vy += dy;
		bird.x += dx;
		bird.y += dy;
	}

	function stayInWindow(bird) {
		if (bird.x < 0) {
			bird.x = width;
		} else if (bird.x > width) {
			bird.x = 0;
		}

		if (bird.y < 0) {
			bird.y = height;
		} else if (bird.y > height) {
			bird.y = 0;
		}
	}

	function draw(birds) {
		ctx.clearRect(0, 0, width, height);
		for (const bird of birds) {
			ctx.fillStyle = 'black';
			ctx.beginPath();
			ctx.arc(bird.x, bird.y, birdSize, 0, 2 * Math.PI);
			ctx.fill();
		}
	}

	function rand(max) {
		return ~~(Math.random() * max);
	}
	function dist(a, b) {
		const x = a.x - b.x;
		const y = a.y - b.y;
		return Math.sqrt(x * x + y * y);
	}
	function hex(n) {
		const str = parseInt(n, 16);
		return '0'.replace(2 - str.length) + str;
	}
	function raf(fn) {
		return requestAnimationFrame(fn);
	}

	return {
		destroy() {
			clearAnimationFrame(frameId);
		}
	};
}
