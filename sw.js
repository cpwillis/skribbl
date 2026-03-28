const CACHE = 'skribbl-solver-v1';

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/privacy.html',
    '/css/style.css',
    '/js/app.js',
    '/js/pwa.js',
    '/manifest.webmanifest',
    '/404.html',
    '/words/manifest.json',
    '/words/Categories/Animals/Animals.json',
    '/words/Categories/Animals/Birds.json',
    '/words/Categories/Animals/Bugs.json',
    '/words/Categories/Animals/Dinosaurs.json',
    '/words/Categories/Animals/Lizards.json',
    '/words/Categories/Animals/Mammals.json',
    '/words/Categories/Anime/Adventure.json',
    '/words/Categories/Anime/Horror.json',
    '/words/Categories/Anime/Romance.json',
    '/words/Categories/Anime/SliceOfLife.json',
    '/words/Categories/Brands/Automotive.json',
    '/words/Categories/Brands/Fashion.json',
    '/words/Categories/Brands/Tech.json',
    '/words/Categories/Countries/Africa.json',
    '/words/Categories/Countries/America.json',
    '/words/Categories/Countries/Asia.json',
    '/words/Categories/Countries/Europe.json',
    '/words/Categories/Countries/Oceania.json',
    '/words/Categories/Difficulties/Difficult.json',
    '/words/Categories/Difficulties/Easy.json',
    '/words/Categories/Difficulties/Hard.json',
    '/words/Categories/Difficulties/Medium.json',
    '/words/Categories/Dungeons&Dragons/GrabBag.json',
    '/words/Categories/Dungeons&Dragons/Items.json',
    '/words/Categories/Dungeons&Dragons/Monsters.json',
    '/words/Categories/Dungeons&Dragons/Spells.json',
    '/words/Categories/FamousPeople/Actors.json',
    '/words/Categories/FamousPeople/Musicians.json',
    '/words/Categories/FamousPeople/YouTubers.json',
    '/words/Categories/Food&Drinks/Drinks.json',
    '/words/Categories/Food&Drinks/Foods.json',
    '/words/Categories/Food&Drinks/Vegetables.json',
    '/words/Categories/HarryPotter/Characters.json',
    '/words/Categories/HarryPotter/General.json',
    '/words/Categories/HarryPotter/Spells.json',
    '/words/Categories/Miscellaneous/Meme.json',
    '/words/Categories/Miscellaneous/NSFW.json',
    '/words/Categories/Miscellaneous/RandomItemsObjects.json',
    '/words/Categories/Movies&Shows/Aciton.json',
    '/words/Categories/Movies&Shows/Comedy.json',
    '/words/Categories/Movies&Shows/Crime.json',
    '/words/Categories/Movies&Shows/DCUniverse.json',
    '/words/Categories/Movies&Shows/Horror.json',
    '/words/Categories/Movies&Shows/Marvel.json',
    '/words/Categories/Movies&Shows/Netflix.json',
    '/words/Categories/Movies&Shows/TVSeries.json',
    '/words/Categories/Pokemon/Gen1.json',
    '/words/Categories/Pokemon/Gen2.json',
    '/words/Categories/Pokemon/Gen3.json',
    '/words/Categories/Pokemon/Gen4.json',
    '/words/Categories/Pokemon/Gen5.json',
    '/words/Categories/Pokemon/Gen6.json',
    '/words/Categories/Pokemon/Gen7.json',
    '/words/Categories/Pokemon/Gen8.json',
    '/words/Categories/Sports/Athletes.json',
    '/words/Categories/Sports/Sports.json',
    '/words/Categories/VideoGames/Fortnite.json',
    '/words/Categories/VideoGames/League of Legends.json',
    '/words/Categories/VideoGames/LeagueOfLegends.json',
    '/words/Categories/VideoGames/Minecraft.json',
    '/words/Categories/VideoGames/MobileLegends.json',
    '/words/Categories/VideoGames/Nintendo.json',
    '/words/Categories/VideoGames/Overwatch Heroes.json',
    '/words/Categories/VideoGames/Roblox.json',
    '/words/Categories/VideoGames/SuperSmashBrosUltimate.json',
    '/words/Default/English.json',
    '/words/Default/English2.json',
    '/words/Default/English3.json',
    '/words/Default/French.json',
    '/words/Default/German.json',
    '/words/Default/Korean.json',
    '/words/Default/Spanish.json',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // Only handle same-origin GET requests
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200 || response.type !== 'basic') return response;
                const clone = response.clone();
                caches.open(CACHE).then(cache => cache.put(event.request, clone));
                return response;
            });
        })
    );
});
