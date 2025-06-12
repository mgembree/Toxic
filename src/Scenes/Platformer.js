class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    // GAME SETTINGS & VARIABLES
    init(data) {
        // Level management - Fixed to match Load.js names
        this.currentLevel = data.level || 1;
        this.levelFiles = {
            1: "toxiclevel1",
            2: "toxiclevel2", 
            3: "toxiclevel3"
        };
        
        this.ACCELERATION = 200;
        this.DRAG = 700;
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -420;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        
        this.DASH_VELOCITY = 300;
        this.DASH_DURATION = 150;
        this.DASH_COOLDOWN = 400;
        
        this.WALL_JUMP_VELOCITY_X = 300;
        this.WALL_JUMP_VELOCITY_Y = -380;
        this.WALL_SLIDE_SPEED = 100;
        
        this.MAX_VELOCITY = 350;
        
        this.playerCanMove = true;
        this.gameOverActive = false;
        
        this.isDashing = false;
        this.dashStartTime = 0;
        this.lastDashTime = 0;
        this.dashDirection = 0;
        this.dashStartY = 0;
        
        this.isWallSliding = false;
        this.wallJumpDirection = 0;
        this.wallJumpTime = 0;
        this.WALL_JUMP_DURATION = 200;
        
        this.lastWaterSplashTime = 0; // Initialize this property
    }

    // SCENE CREATION
    create() {
        // SOUND SETUP
        this.sounds = {
            jump: this.sound.add('jump', { volume: 0.3 }),
            lose: this.sound.add('lose', { volume: 0.5 }),
            win: this.sound.add('win', { volume: 0.4 }),
            pickupCoin: this.sound.add('pickupCoin', { volume: 0.4 }),
            switch: this.sound.add('switch', { volume: 0.5 }),
            dash: this.sound.add('dash', { volume: 0.4 })
        };

        // BACKGROUND LAYERS
        const gameHeight = 720; 
        const bg1Scale = gameHeight / 160; 
        this.bg1 = this.add.tileSprite(0, 0, 272 * bg1Scale * 3, gameHeight, 'bg1');
        this.bg1.setOrigin(0, 0);
        this.bg1.setScale(bg1Scale);
        this.bg1.setScrollFactor(0.1);
        this.bg1.setDepth(-10);

        const bg2Scale = gameHeight / 142;
        this.bg2 = this.add.tileSprite(0, 0, 213 * bg2Scale * 3, gameHeight, 'bg2'); 
        this.bg2.setOrigin(0, 0);
        this.bg2.setScale(bg2Scale);
        this.bg2.setScrollFactor(0.25);
        this.bg2.setDepth(-8);

        const bg3Scale = gameHeight / 150;
        this.bg3 = this.add.tileSprite(0, 0, 272 * bg3Scale * 2.5, gameHeight, 'bg3'); 
        this.bg3.setOrigin(0, 0);
        this.bg3.setScale(bg3Scale);
        this.bg3.setScrollFactor(0.5);
        this.bg3.setDepth(-6);

        const bg4Scale = gameHeight / 104; 
        this.bg4 = this.add.tileSprite(0, 0, 272 * bg4Scale * 2, gameHeight, 'bg4'); 
        this.bg4.setOrigin(0, 0);
        this.bg4.setScale(bg4Scale);
        this.bg4.setScrollFactor(0.75);
        this.bg4.setDepth(-4);

        // TILEMAP SETUP
        const currentLevelFile = this.levelFiles[this.currentLevel];
        console.log("Loading level:", currentLevelFile);
        
        this.map = this.add.tilemap(currentLevelFile, 18, 18, 160, 40);
        
        if (!this.map) {
            console.error("Failed to load tilemap:", currentLevelFile);
            return;
        }
        
        console.log("Available layers:", this.map.layers.map(layer => layer.name));
        console.log("Available tilesets:", this.map.tilesets.map(ts => ({ name: ts.name, image: ts.image, firstgid: ts.firstgid })));
        
        // Handle embedded tileset loading
        this.tileset = null;
        
        if (this.map.tilesets && this.map.tilesets.length > 0) {
            const embeddedTileset = this.map.tilesets[0];
            console.log("Found embedded tileset:", embeddedTileset.name);
            console.log("Embedded tileset image property:", embeddedTileset.image);
            
            // For embedded tilesets, we don't specify a tileset name, just the image key
            // The tileset data is already embedded in the map
            this.tileset = this.map.addTilesetImage(null, "tilemap_tiles");
            
            // If that doesn't work, try using the embedded tileset name
            if (!this.tileset) {
                console.log("First attempt failed, trying with tileset name...");
                this.tileset = this.map.addTilesetImage(embeddedTileset.name, "tilemap_tiles");
            }
            
            // Last resort - try different variations
            if (!this.tileset) {
                console.log("Second attempt failed, trying variations...");
                // Try with the actual image filename from the embedded tileset
                const imageFileName = embeddedTileset.image;
                if (imageFileName) {
                    // Remove file extension and path
                    const imageKey = imageFileName.replace(/\.[^/.]+$/, "").replace(/^.*[\\\/]/, "");
                    console.log("Trying with image key:", imageKey);
                    this.tileset = this.map.addTilesetImage(imageKey, "tilemap_tiles");
                }
            }
        }
        
        if (!this.tileset) {
            console.error("Failed to create tileset! Available textures:", Object.keys(this.textures.list));
            console.error("Map tilesets:", this.map.tilesets);
            return;
        } else {
            console.log("Successfully created tileset:", this.tileset.name);
            console.log("Tileset image key:", this.tileset.image ? this.tileset.image.key : "No image");
        }
        
        // Try to create layers, but check if they exist first
        this.foregroundLayer = null;
        this.foregroundLayer2 = null;
        this.groundLayer = null;
        
        if (this.map.getLayer("foreground")) {
            this.foregroundLayer = this.map.createLayer("foreground", this.tileset, 0, 0);
            this.foregroundLayer.setDepth(10);
        }
        
        if (this.map.getLayer("foreground0.5")) {
            this.foregroundLayer2 = this.map.createLayer("foreground0.5", this.tileset, 0, 0);
            this.foregroundLayer2.setDepth(5);
        }
        
        if (this.map.getLayer("groundnplats")) {
            this.groundLayer = this.map.createLayer("groundnplats", this.tileset, 0, 0);
            this.groundLayer.setDepth(0);
            this.groundLayer.setCollisionByProperty({
                collides: true
            });
            console.log("Ground layer created successfully");
        } else {
            console.error("Layer 'groundnplats' not found in tilemap!");
            console.log("Available layers:", this.map.layers.map(layer => layer.name));
        }

        // DOOR DETECTION
        this.doorTiles = [];
        if (this.foregroundLayer2) {
            this.foregroundLayer2.forEachTile(tile => {
                if (tile && tile.properties && tile.properties.door) {
                    this.doorTiles.push({
                        x: tile.pixelX,
                        y: tile.pixelY,
                        width: tile.width,
                        height: tile.height
                    });
                }
            });
        }

        // WATER ANIMATION
        this.anims.create({
            key: 'water',
            frames: [ 
                { key: 'tilemap_sheet', frame: 13 },
                { key: 'tilemap_sheet', frame: 29 }
            ],
            frameRate: 6,
            repeat: -1
        });

        // PARTICLE EFFECTS
        my.vfx.chests = this.add.particles(0,0,"kenny-particles",{
            frame: ['star_01.png','star_02.png'],
            random:true,
            scale: {start:0.1, end:0},
            maxAliveParticles: 2,
            lifespan: 500,
            gravityY: -400,
            alpha: {start: 1,end: 0},
        });
        my.vfx.chests.stop();
        
        my.vfx.water = this.add.particles(0,0,"kenny-particles",{
            frame: ['circle_01.png'],
            random:true,
            scale: {start:0.1, end:0},
            maxAliveParticles: 10,
            lifespan: 500,
            gravityY: -400,
            alpha: {start: 1,end: 0},
            speed: 50,
            angle: { min: 240, max: 300 },
            tint: 0x0099ff,
        });
        my.vfx.water.stop();

        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_01.png','smoke_03.png','smoke_04.png'],
            random: true,
            scale: {start: 0.01, end: 0.1},
            maxAliveParticles: 10,
            lifespan: 350,
            gravityY: -100,
            alpha: {start: 1, end: 0.1}, 
            angle: { min: 170, max: 180}
        });
        my.vfx.walking.stop();

        my.vfx.dash = this.add.particles(0, 0, "kenny-particles", {
            frame: ['star_01.png', 'star_02.png'],
            random: true,
            scale: {start: 0.05, end: 0.2},
            maxAliveParticles: 15,
            lifespan: 300,
            alpha: {start: 1, end: 0},
            speed: 100,
            tint: 0xffaa00
        });
        my.vfx.dash.stop();

        // WATER TILES
        if (this.groundLayer) {
            this.groundLayer.forEachTile(tile => {
                if (tile && tile.properties && tile.properties.water) {
                    tile.alpha = 0;
                    
                    const water = this.add.sprite(tile.pixelX + 9, tile.pixelY + 9, 'tilemap_sheet');
                    water.setOrigin(0.5, 0.5);
                    water.play('water');
                }
            });
        }

        // COLLECTIBLE CHESTS
        this.chests = this.map.createFromObjects("Objects", {
            name: "chests",
            key: "tilemap_sheet",
            frame: 60
        });

        this.physics.world.enable(this.chests, Phaser.Physics.Arcade.STATIC_BODY);
        this.chestGroup = this.add.group(this.chests);

        // BUTTONS
        this.buttons = this.map.createFromObjects("Objects", {
            name: "button",
            key: "tilemap_sheet",
            frame: 61
        });

        this.physics.world.enable(this.buttons, Phaser.Physics.Arcade.STATIC_BODY);
        this.buttonGroup = this.add.group(this.buttons);
        
        // WATER TILES COLLECTION
        if (this.groundLayer) {
            this.waterTiles = this.groundLayer.filterTiles(tile => {
                return tile.properties && tile.properties.water === true;
            });
        }

        // WIN ZONE
        this.winZone = {
            x: 2835,  
            y: 474,   
            width: 18, 
            height: 18 
        };

        // PLAYER SETUP - Spawn at top left ceiling to fall onto platform
        my.sprite.player = this.physics.add.sprite(30, 50, "platformer_characters", "tile_0000.png");
        
        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        my.sprite.player.setCollideWorldBounds(true);

        // COLLISION HANDLERS
        if (this.groundLayer) {
            this.physics.add.collider(my.sprite.player, this.groundLayer);
        }
        
        this.physics.add.overlap(my.sprite.player, this.chestGroup, (obj1, obj2) => {
            const chestX = obj2.x;
            const chestY = obj2.y;

            obj2.destroy(); 
            
            this.sounds.pickupCoin.play();
            
            my.vfx.chests.setPosition(chestX,chestY);
            my.vfx.chests.start();

            this.time.delayedCall(100, () => {
                my.vfx.chests.stop();
            });
        });

        this.physics.add.overlap(my.sprite.player, this.buttonGroup, (obj1, obj2) => {
            obj2.destroy();
            this.sounds.switch.play();
            this.activateSwitchablePlatforms();
        });

        // INPUT SETUP
        this.cursors = this.input.keyboard.createCursorKeys();
        this.rKey = this.input.keyboard.addKey('R');
        this.dashKey = this.input.keyboard.addKey('X');

        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true;
            this.physics.world.debugGraphic.clear();
        }, this);

        // CAMERA SETUP
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        // UI TEXT
        this.gameOverText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, '', {
            fontSize: '32px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);

        this.restartText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'Press R to Restart', {
            fontSize: '24px',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);
    }

    // MAIN UPDATE LOOP
    update() {
        const currentTime = this.time.now;
        
        if (!this.playerCanMove) {
            if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
                this.scene.restart();
            }
            return;
        }

        this.handleDash(currentTime);
        this.handleWallInteraction();
        
        if (!this.isDashing && (currentTime - this.wallJumpTime > this.WALL_JUMP_DURATION)) {
            this.handleMovement();
        }

        this.handleJumping();
        this.applyVelocityCap();
        this.checkWaterCollision();
        this.checkDoorCollision();
        this.checkWinCondition();

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.scene.restart();
        }
    }

    // VELOCITY LIMITS
    applyVelocityCap() {
        const currentVelX = my.sprite.player.body.velocity.x;
        if (Math.abs(currentVelX) > this.MAX_VELOCITY) {
            const direction = currentVelX > 0 ? 1 : -1;
            my.sprite.player.setVelocityX(this.MAX_VELOCITY * direction);
        }
    }

    // DASH MECHANICS
    handleDash(currentTime) {
        if (Phaser.Input.Keyboard.JustDown(this.dashKey) && 
            !this.isDashing && 
            !my.sprite.player.body.blocked.down && 
            currentTime - this.lastDashTime > this.DASH_COOLDOWN) {
            
            this.startDash(currentTime);
        }
        
        if (this.isDashing) {
            my.sprite.player.setVelocityY(0);
            my.sprite.player.body.setGravityY(0);
            
            if (currentTime - this.dashStartTime > this.DASH_DURATION) {
                this.endDash();
            }
        }
    }

    startDash(currentTime) {
        this.isDashing = true;
        this.dashStartTime = currentTime;
        this.lastDashTime = currentTime;
        this.dashStartY = my.sprite.player.y;
        
        if (this.cursors.left.isDown) {
            this.dashDirection = -1;
        } else if (this.cursors.right.isDown) {
            this.dashDirection = 1;
        } else {
            this.dashDirection = my.sprite.player.flipX ? 1 : -1;
        }
        
        my.sprite.player.setVelocityX(this.DASH_VELOCITY * this.dashDirection);
        
        // Play dash sound effect
        this.sounds.dash.play();
        
        my.vfx.dash.startFollow(my.sprite.player);
        my.vfx.dash.start();
    }

    endDash() {
        this.isDashing = false;
        my.sprite.player.body.setGravityY(0);
        my.vfx.dash.stop();
    }

    // WALL INTERACTION - Improved wall detection and sliding
    handleWallInteraction() {
        if (!this.groundLayer) return;
        
        const leftWall = this.checkWallCollision(-1);
        const rightWall = this.checkWallCollision(1);
        
        this.isWallSliding = false;
        
        // Only allow wall sliding when in the air and moving toward the wall
        if (!my.sprite.player.body.blocked.down && my.sprite.player.body.velocity.y > 0) {
            if ((leftWall && this.cursors.left.isDown) || (rightWall && this.cursors.right.isDown)) {
                this.isWallSliding = true;
                
                // Limit fall speed when wall sliding
                if (my.sprite.player.body.velocity.y > this.WALL_SLIDE_SPEED) {
                    my.sprite.player.setVelocityY(this.WALL_SLIDE_SPEED);
                }
                
                // Add some visual feedback for wall sliding
                console.log("Wall sliding!");
            }
        }
    }

    checkWallCollision(direction) {
        if (!this.groundLayer) return false;
        
        const playerBody = my.sprite.player.body;
        const tileSize = 18; // Your tile size
        
        // Check multiple points along the player's side
        const checkX = direction > 0 ? 
            playerBody.right + (direction * 2) : // Right side + offset
            playerBody.left + (direction * 2);   // Left side + offset
            
        // Check at multiple Y positions (top, middle, bottom of player)
        const checkPoints = [
            playerBody.top + 4,
            playerBody.center.y,
            playerBody.bottom - 4
        ];
        
        for (let checkY of checkPoints) {
            const tileX = this.groundLayer.worldToTileX(checkX);
            const tileY = this.groundLayer.worldToTileY(checkY);
            
            const tile = this.groundLayer.getTileAt(tileX, tileY);
            
            // Check if tile exists and has collision
            if (tile && tile.index !== -1 && (tile.collides || (tile.properties && tile.properties.collides))) {
                console.log(`Wall detected at direction ${direction}, tile:`, tile.index, "at", tileX, tileY);
                return true;
            }
        }
        
        return false;
    }

    // BASIC MOVEMENT
    handleMovement() {
        if(this.cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else if(this.cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            }

        } else {
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
        }
    }

    // JUMPING MECHANICS - Improved wall jump detection
    handleJumping() {
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        
        if(Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            // Regular ground jump
            if(my.sprite.player.body.blocked.down) {
                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
                this.sounds.jump.play();
            }
            // Wall jump - check if player is against a wall
            else {
                const leftWall = this.checkWallCollision(-1);
                const rightWall = this.checkWallCollision(1);
                
                if (leftWall || rightWall || this.isWallSliding) {
                    this.performWallJump();
                }
            }
        }
    }

    performWallJump() {
        const currentTime = this.time.now;
        
        const leftWall = this.checkWallCollision(-1);
        const rightWall = this.checkWallCollision(1);
        
        // Determine jump direction based on which wall we're against
        if (leftWall && !rightWall) {
            this.wallJumpDirection = 1; // Jump right from left wall
        } else if (rightWall && !leftWall) {
            this.wallJumpDirection = -1; // Jump left from right wall
        } else if (this.isWallSliding) {
            // If we're wall sliding, jump away from the direction we're facing
            this.wallJumpDirection = my.sprite.player.flipX ? -1 : 1;
        } else {
            console.log("No wall found for wall jump");
            return; // No wall to jump from
        }
        
        console.log("Performing wall jump in direction:", this.wallJumpDirection);
        
        // Apply wall jump velocities
        my.sprite.player.setVelocityX(this.WALL_JUMP_VELOCITY_X * this.wallJumpDirection);
        my.sprite.player.setVelocityY(this.WALL_JUMP_VELOCITY_Y);
        
        // Record the time for temporary movement override
        this.wallJumpTime = currentTime;
        
        this.sounds.jump.play();
        
        // Update sprite direction
        if (this.wallJumpDirection > 0) {
            my.sprite.player.setFlip(true, false);
        } else {
            my.sprite.player.resetFlip();
        }
    }

    // COLLISION DETECTION
    checkWaterCollision() {
        if (!this.groundLayer) return;
        
        const currentTime = this.time.now;
        
        if (currentTime - this.lastWaterSplashTime < 150) {
            return;
        }
        
        const playerTileX = this.groundLayer.worldToTileX(my.sprite.player.x);
        const playerTileY = this.groundLayer.worldToTileY(my.sprite.player.y + my.sprite.player.height / 2);
        
        const tile = this.groundLayer.getTileAt(playerTileX, playerTileY);
        
        if (tile && tile.properties && tile.properties.water) {
            this.playerCanMove = false;
            my.sprite.player.setVelocity(0, 0);
            my.sprite.player.setAcceleration(0, 0);
            my.vfx.walking.stop();
            
            if (this.isDashing) {
                this.endDash();
            }
            
            const waterX = tile.pixelX + tile.width / 2;
            const waterY = tile.pixelY;
         
            my.vfx.water.setPosition(waterX, waterY);
            my.vfx.water.start();
            
            this.sounds.lose.play();
            
            this.time.delayedCall(150, () => {
                my.vfx.water.stop();
            });
            
            this.tweens.add({
                targets: my.sprite.player,
                y: my.sprite.player.y - 20,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    this.showWaterGameOver();
                }
            });
            
            this.lastWaterSplashTime = currentTime;
        }
    }

    checkDoorCollision() {
        for (let door of this.doorTiles) {
            if (my.sprite.player.x >= door.x && 
                my.sprite.player.x <= door.x + door.width &&
                my.sprite.player.y >= door.y && 
                my.sprite.player.y <= door.y + door.height) {
                
                this.goToNextLevel();
                break;
            }
        }
    }

    checkWinCondition() {
        if (my.sprite.player.x >= this.winZone.x && 
            my.sprite.player.x <= this.winZone.x + this.winZone.width &&
            my.sprite.player.y >= this.winZone.y && 
            my.sprite.player.y <= this.winZone.y + this.winZone.height) {
            
            this.playerCanMove = false;
            my.sprite.player.setVelocity(0, 0);
            my.sprite.player.setAcceleration(0, 0);
            my.vfx.walking.stop();
            
            if (this.isDashing) {
                this.endDash();
            }
            
            this.showWinCondition();
        }
    }

    // GAME STATE HANDLERS
    showWaterGameOver() {
        this.gameOverText.setText('Game Over!\n');
        this.gameOverText.setVisible(true);
        this.restartText.setText('Press R to Restart');
        this.restartText.setVisible(true);
        this.gameOverActive = false; 
    }

    showWinCondition() {
        this.sounds.win.play();  
        this.gameOverText.setText('Level Complete!\nWell Done!');
        this.gameOverText.setVisible(true);
        this.restartText.setText('Press R to Restart');
        this.restartText.setVisible(true);
        this.gameOverActive = true; 
    }

    hideGameOverUI() {
        this.gameOverText.setVisible(false);
        this.restartText.setVisible(false);
    }

    activateSwitchablePlatforms() {
        if (!this.groundLayer) return;
        
        this.groundLayer.forEachTile(tile => {
            if (tile && tile.properties && tile.properties.toswitch) {
                tile.setCollision(true);
            }
        });
    }

    goToNextLevel() {
        const nextLevel = this.currentLevel + 1;
        
        if (this.levelFiles[nextLevel]) {
            this.scene.restart({ level: nextLevel });
        } else {
            this.showGameComplete();
        }
    }

    showGameComplete() {
        this.playerCanMove = false;
        my.sprite.player.setVelocity(0, 0);
        my.sprite.player.setAcceleration(0, 0);
        my.vfx.walking.stop();
        
        if (this.isDashing) {
            this.endDash();
        }
        
        this.sounds.win.play();
        this.gameOverText.setText('Game Complete!\nAll Levels Finished!');
        this.gameOverText.setVisible(true);
        this.restartText.setText('Press R to Play Again');
        this.restartText.setVisible(true);
        this.gameOverActive = true;
    }
}