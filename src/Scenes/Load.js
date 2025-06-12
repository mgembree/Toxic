class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.load.setPath("./assets/");
    
        // Background images
        this.load.image('bg1', 'bg4.png');
        this.load.image('bg2', 'bg3.png');
        this.load.image('bg3', 'bg2.png');
        this.load.image('bg4', 'bg1.png');

        // Audio files
        this.load.audio('jump', 'jump.wav');
        this.load.audio('lose', 'lose.wav');
        this.load.audio('win', 'win.wav');
        this.load.audio('pickupCoin', 'pickupCoin.wav');

        // Load characters spritesheet
        this.load.atlas("platformer_characters", "tilemap-characters-packed.png", "tilemap-characters-packed.json");

        // Load tilemap information - CRITICAL FOR EMBEDDED TILESETS
        // For embedded tilesets, we need to load the image with a key that we'll reference later
        this.load.image("tilemap_tiles", "tilemap_packed.png");
        
        // Load the tilemap JSON files
        this.load.tilemapTiledJSON("toxiclevel1", "toxiclevel1.tmj");
        this.load.tilemapTiledJSON("toxiclevel2", "toxiclevel2.tmj");
        this.load.tilemapTiledJSON("toxiclevel3", "toxiclevel3.tmj");
        
        // Load the tilemap as a spritesheet (for animations and particles)
        this.load.spritesheet("tilemap_sheet", "tilemap_packed.png", {
            frameWidth: 18,
            frameHeight: 18
        });

        // Particle effects
        this.load.multiatlas("kenny-particles", "kenny-particles.json");
        
        // Debug: Log when assets are loaded
        this.load.on('filecomplete', (key, type, data) => {
            if (key === 'tilemap_tiles' || key.includes('toxiclevel')) {
                console.log(`Loaded ${type}: ${key}`);
            }
        });
    }

    create() {
        // Create animations
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNames('platformer_characters', {
                prefix: "tile_",
                start: 0,
                end: 1,
                suffix: ".png",
                zeroPad: 4
            }),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "tile_0000.png" }
            ],
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            defaultTextureKey: "platformer_characters",
            frames: [
                { frame: "tile_0001.png" }
            ],
        });

        // Debug: Check if our critical assets loaded properly
        console.log("Checking loaded assets:");
        console.log("tilemap_tiles texture exists:", this.textures.exists('tilemap_tiles'));
        console.log("tilemap_sheet texture exists:", this.textures.exists('tilemap_sheet'));
        console.log("toxiclevel1 tilemap exists:", this.cache.tilemap.exists('toxiclevel1'));

        // Start the game scene
        this.scene.start("platformerScene");
    }

    update() {
        // This won't be called since we start a new scene
    }
}