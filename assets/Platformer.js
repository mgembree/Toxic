class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.lastWaterSplashTime = 0; // Track last water splash time to control frequency
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        my.vfx.coins = this.add.particles(0,0,"kenny-particles",{
            frame: ['star_01.png','star_02.png'],
            random:true,
            scale: {start:0.1, end:0},
            maxAliveParticles: 2,
            lifespan: 500,
            gravityY: -400,
            alpha: {start: 1,end: 0},
        });
        my.vfx.coins.stop();
        
        my.vfx.water = this.add.particles(0,0,"kenny-particles",{
            frame: ['circle_01.png'],
            random:true,
            scale: {start:0.1, end:0},
            maxAliveParticles: 10,
            lifespan: 500,
            gravityY: -400,
            alpha: {start: 1,end: 0},
            speed: 50,
            angle: { min: 240, max: 300 },tint: 0x0099ff,
        });
        my.vfx.water.stop();

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        // Find water tiles
        this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water === true;
        });

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 345, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);
        
        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            const coinX = obj2.x;
            const coinY = obj2.y;

            obj2.destroy(); 
            
            my.vfx.coins.setPosition(coinX,coinY);
            my.vfx.coins.start();

            this.time.delayedCall(100, () => {
                my.vfx.coins.stop();
            });
        });

        // set up Phaser-provided cursor key input
        this.cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true;
            this.physics.world.debugGraphic.clear();
        }, this);

        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    update() {
        if(this.cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            
        } else if(this.cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            
        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        this.checkWaterCollision();

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }

    // Function to check for water collision and create splash effects
    checkWaterCollision() {
   
        const currentTime = this.time.now;
        
        if (currentTime - this.lastWaterSplashTime < 150) {
            return;
        }
        
        // Convert player position to tile position
        const playerTileX = this.groundLayer.worldToTileX(my.sprite.player.x);
        const playerTileY = this.groundLayer.worldToTileY(my.sprite.player.y + my.sprite.player.height / 2);
        
        // Get the tile at player's position
        const tile = this.groundLayer.getTileAt(playerTileX, playerTileY);
        
    
        if (tile && tile.properties && tile.properties.water) {
    
            const waterX = tile.pixelX + tile.width / 2;
            const waterY = tile.pixelY;
         
            my.vfx.water.setPosition(waterX, waterY);
            my.vfx.water.start();
            
         
            this.time.delayedCall(150, () => {
                my.vfx.water.stop();
            });
            
            this.lastWaterSplashTime = currentTime;
        }
    }
}