let Shake = function Shake(page = {}) {
    this.page = page
    this.x = 0
    this.y = 0
    this.z = 0
    this.last_x = 0
    this.last_y = 0
    this.last_z = 0
    this.last_update = 0
    this.frequency = 1000,
    this.speed = 2;
}

Shake.prototype.onShakeHandler = function onShakeHandler(event) {
    if (0 == this.last_x && 0 == this.last_y && 0 == this.last_z) {
        return this.last_x = event.x, this.last_y = event.y, this.last_z = event.z;
    }
    let diff_x = Math.abs(this.last_x - event.x),
        diff_y = Math.abs(this.last_y - event.y),
        diff_z = Math.abs(this.last_z - event.z)
    if ((diff_x > this.speed || diff_y > this.speed || diff_z > this.speed) && +new Date - this.last_update > this.frequency) {
        console.log("shake=", diff_x, diff_y, diff_z)
        this.last_update = +new Date
        if(this.page.onShakeHandler){
            this.page.onShakeHandler({
                isShake: true
            })
        }
    }
    this.last_x = this.x
    this.last_y = this.y
    this.last_z = this.z
}

Shake.prototype.init = function init(frequency, speed) {
    this.frequency = frequency || this.frequency
    this.speed = speed || this.speed
    wx.onAccelerometerChange(this.onShakeHandler.bind(this))
}

Shake.prototype.start = function start() {
    wx.startAccelerometer && wx.startAccelerometer()
}

Shake.prototype.stop = function stop() {
    wx.stopAccelerometer && wx.stopAccelerometer()
}

export default Shake