function break_abc(data) {
    if (data.link === '' && data.data.length === 0) { return }
    data = data || {
        data: [],
    };
    let container = document.querySelector('body');
    if (!container.offsetHeight) { container.style.height = '100vh' }
    let movableElement = document.createElement('a');
    movableElement.href = 'javascript:;';
    movableElement.style = 'display: block;width: 48px;height: 48px;border-radius: 12px;overflow: hidden;position: fixed;z-index: 888888;bottom: 100px;left: 10px;margin:0;pading:0;box-size:border-box;';
    movableElement.draggable = true;
    let movableElementImg = document.createElement('img');
    movableElementImg.src = 'http://192.168.1.154:8818/src/rank.png'
    movableElementImg.width = 48
    movableElement.appendChild(movableElementImg);
    document.body.appendChild(movableElement);
    let isTouchDevice = 'ontouchstart' in window; /* 判断是否为触摸设备 */
    let drageable = false;
    let startX = 0, startY = 0; /* 触摸开始位置 */
    let game_rank_mask = document.createElement("div");
    game_rank_mask.style = 'position: fixed;left: 0;font-family: "Microsoft YaHei";top: 0;width: 100%;height: 100%;z-index: 999999;display: none;background-color: rgba(0,0,0,.85);';

    let game_rank_mask_content = document.createElement("div");

    if (data.data.length === 0) {
        game_rank_mask_content.style = 'width: 100%;max-width: 600px;position: absolute;background: #22075E;left: 50%;bottom: 0;transform: translateX(-50%);border-radius: 16px 16px 0 0;padding:30px 16px 50px;'
        

    } else {
        game_rank_mask_content.style = 'width: 100%;max-width: 600px;position: absolute;background: #22075E;left: 50%;bottom: 0;transform: translateX(-50%);border-radius: 16px 16px 0 0;padding:0 16px;height:calc(100% - 64px);'
        let game_rank_pat = document.createElement('div');
        game_rank_pat.style = 'padding: 16px 0 0;display: flex;align-items: stretch;flex-direction: column;' +
            'height:calc(100% - 100px);';
        if (data.link === '') { game_rank_pat.style.height = '100%' }
        game_rank_mask_content.appendChild(game_rank_pat)
        let game_rank_pat_title = document.createElement('h1')
        game_rank_pat_title.innerText = 'RANKING'
        game_rank_pat_title.style = 'text-align: center;color: #fff;font-size: 14px;margin:0;padding:0;'
        game_rank_pat.appendChild(game_rank_pat_title);
        let game_rank_top3 = document.createElement('ul');
        game_rank_top3.style = 'display: flex;align-items: flex-end;justify-content: center;margin:0 0 16px;padding:0;';
        let top_arr = data.data.slice(0, 3);
        top_arr.unshift(top_arr.splice(1, 1)[0]);
        top_arr.forEach(function (item, index) {
            let li = document.createElement('li')
            switch (index) {
                case 0:
                    li.style = 'width: 28%;display: flex;align-items: center;flex-direction: column;justify-content: flex-end;'
                    break
                case 1:
                    li.style = 'width: 32%;margin-left:8px;display: flex;align-items: center;flex-direction: column;justify-content: flex-end;'
                    break
                default:
                    li.style = 'width: 28%;margin-left:8px;display: flex;align-items: center;flex-direction: column;justify-content: flex-end;'
            }
            let img = document.createElement('img')
            img.src = 'http://192.168.1.154:8818/src/rank.png'
            img.style.width = '100%'
            let dl = document.createElement('dl')
            dl.style = 'margin:0;padding:0;'
            dl.style.marginTop = '4px'
            let dt = document.createElement('dt')
            dt.style = 'display: flex;align-items: center;color: #FFC53D;font-size: 14px;font-weight: 600;margin-bottom: 4px;'
            let dt_img = document.createElement('img')
            dt_img.src = 'http://192.168.1.154:8818/src/rank.png'
            dt_img.style = 'width: 16px;margin-right: 4px;'
            dt.append(dt_img, item.level ? 'Lv' + item.level + ' - ' + item.score : item.score)
            let dd = document.createElement('dd')
            dd.innerText = item.rank_date
            dd.style = 'font-size: 12px;color: rgba(255,255,255,.65);font-weight: 600;text-align: center;margin:0;'
            dl.append(dt, dd)
            li.append(img, dl)
            game_rank_top3.appendChild(li)
        })
        game_rank_pat.appendChild(game_rank_top3)
        let game_rank_top20 = document.createElement('ul')
        game_rank_top20.style = 'flex-shrink: 1;flex-grow: 1;overflow-y: scroll;margin:0;padding:0;'
        game_rank_pat.appendChild(game_rank_top20)
        function top_20_arr_html(is_smaill_landscape) {
            let li_box = document.createDocumentFragment()
            let arr = is_smaill_landscape ? data.data : data.data.slice(3);
            arr.forEach(function (item, index) {
                let li = document.createElement('li')
                li.style = 'display: flex;align-items: center;justify-content: space-between;background: #391085;height: 36px;padding: 0 32px;border-radius: 8px;'
                if (index) {
                    li.style.marginTop = '8px'
                }
                let span = document.createElement('span')
                span.style = 'color: #fff;font-size: 14px;font-weight: 600;'
                span.innerText = is_smaill_landscape ? index + 1 : index + 4;
                let p = document.createElement('p')
                p.style = 'display: flex;align-items: center;color: #FFC53D;font-size: 14px;font-weight: 600;margin:0 4px 0;padding:0;'
                let p_img = document.createElement('img')
                p_img.src = 'http://192.168.1.154:8818/src/rank.png'
                p_img.style = 'width: 16px;margin-right: 4px;'
                p.append(p_img, item.level ? 'Lv' + item.level + ' - ' + item.score : item.score)
                let spanr = document.createElement('span')
                spanr.style = 'color: rgba(255,255,255,.65);font-size: 12px;font-weight: 600;'
                spanr.innerText = item.rank_date
                li.append(span, p, spanr)
                li_box.appendChild(li)
            })
            return li_box;

        }
        function set_box_attr() {
            let w_height = window.innerHeight;
            game_rank_top20.innerHTML = null;
            if (w_height < 600) {
                game_rank_mask_content.style.minHeight = '100%'
                game_rank_top3.style.display = 'none'
                game_rank_top20.appendChild(top_20_arr_html(true))
                game_rank_top20.style.marginTop = '15px'
            } else {
                game_rank_top3.style.display = 'flex'
                game_rank_mask_content.style.minHeight = '600px'
                game_rank_top20.appendChild(top_20_arr_html(false))
                game_rank_top20.style.marginTop = '0'
            }
        }
        set_box_attr()
        window.addEventListener('resize', set_box_attr)
    }
    game_rank_mask.appendChild(game_rank_mask_content);
    let close_game_rank_mask = document.createElement("a");
    close_game_rank_mask.href = 'javascript:;';
    close_game_rank_mask.style = 'position: absolute;left: 8px;top: 8px;display:block;';
    let close_game_rank_mask_img = document.createElement('img');
    close_game_rank_mask_img.src = 'http://192.168.1.154:8818/src/rank.png';
    close_game_rank_mask_img.width = 24;
    close_game_rank_mask.appendChild(close_game_rank_mask_img);
    game_rank_mask_content.appendChild(close_game_rank_mask);
    close_game_rank_mask.onclick = function () { game_rank_mask.style.display = 'none' }
    if (data.link !== '') {
        let drainage = document.createElement('div');
        drainage.style = 'padding: 16px 0;display: flex;align-items: center;justify-content: space-between;';
        let drainage_l = document.createElement("div");
        drainage_l.style = 'display: flex;align-items: center;margin-right: 8px;';
        let drainage_l_img = document.createElement('img');
        drainage_l_img.src = 'http://192.168.1.154:8818/src/rank.png';
        drainage_l_img.style = 'height: 48px;border-radius: 8px;margin-right: 8px;'
        let drainage_l_dl = document.createElement('dl');
        drainage_l_dl.style = "margin:0;padding:0;"
        let drainage_l_dl_dt = document.createElement('dt');
        drainage_l_dl_dt.innerText = 'Play More Games!'
        drainage_l_dl_dt.style = 'font-size: 14px;color: #fff;margin-bottom: 6px;'
        let drainage_l_dl_dd = document.createElement('dd');
        drainage_l_dl_dd.innerText = 'Game Center'
        drainage_l_dl_dd.style = 'border: 1px solid #9254DE;height: 22px;border-radius: 4px;line-height: 20px;padding: 0 6px;font-size: 12px;color: #9254DE;margin:0;display:inline-block;margin-inline-start:0;box-size:border-box;'
        drainage_l_dl.append(drainage_l_dl_dt, drainage_l_dl_dd)
        drainage_l.append(drainage_l_img, drainage_l_dl)
        let drainage_link = document.createElement("a")
        drainage_link.href = data.link
        drainage_link.target = '_top'
        drainage_link.innerText = 'OPEN'
        drainage_link.style = 'width: 72px;height: 28px;line-height: 28px;font-weight:600;display:block;text-align: center;border-radius: 15px;background-color: #fff;font-size: 14px; color: #391085;font-weight: 600;text-decoration: none;'
        drainage.append(drainage_l, drainage_link)
        game_rank_mask_content.appendChild(drainage)
    }
    document.body.appendChild(game_rank_mask);
    game_rank_mask.addEventListener('click', function (e) {
        if (e.target === e.currentTarget) {
            game_rank_mask.style.display = 'none'
        }
    })
    function handleMove(event) {
        console.log('handleMove called - setting drageable to true');
        drageable = true;
        var touch = event.touches ? event.touches[0] : event; /* 兼容触摸和鼠标事件 */
        var newLeft = touch.clientX - container.getBoundingClientRect().left - movableElement.offsetWidth / 2;
        var newTop = touch.clientY - container.getBoundingClientRect().top - movableElement.offsetHeight / 2;

        /* 限制元素在指定范围内移动 */
        if (newLeft < 0) {
            newLeft = 0;
        }
        if (newTop < 0) {
            newTop = 0;
        }
        if (newLeft > container.offsetWidth - movableElement.offsetWidth) {
            newLeft = container.offsetWidth - movableElement.offsetWidth;
        }
        if (newTop > container.offsetHeight - movableElement.offsetHeight) {
            newTop = container.offsetHeight - movableElement.offsetHeight;
        }

        movableElement.style.left = newLeft + 'px';
        movableElement.style.top = newTop + 'px';
        console.log('handleMove - moved to:', newLeft, newTop);
    }
    if (isTouchDevice) {
        /* 触摸设备的事件监听 */
        movableElement.addEventListener('touchstart', function (event) {
            console.log('touchstart triggered');
            if (event.touches && event.touches.length === 1) {
                startX = event.touches[0].clientX;
                startY = event.touches[0].clientY;
                drageable = false;
                console.log('touchstart - startX:', startX, 'startY:', startY, 'drageable:', drageable);
            }
        });
        movableElement.addEventListener('touchmove', function (event) {
            console.log('touchmove triggered');
            if (event.cancelable) event.preventDefault(); /* 阻止默认行为，如滚动 */
            handleMove(event);
            console.log('touchmove - drageable:', drageable);
        });
        movableElement.addEventListener('touchend', function (event) {
            console.log('touchend triggered');
            if (event.changedTouches && event.changedTouches.length > 0) {
                let endX = event.changedTouches[0].clientX;
                let endY = event.changedTouches[0].clientY;
                let distance = Math.abs(endX - startX) + Math.abs(endY - startY);
                console.log('touchend - endX:', endX, 'endY:', endY, 'distance:', distance, 'drageable:', drageable);
                if (!drageable || distance < 10) {
                    // 认为是点击
                    console.log('Detected as CLICK - opening modal');
                    console.log('Modal element:', game_rank_mask);
                    console.log('Modal current display:', game_rank_mask.style.display);
                    console.log('Modal computed style:', window.getComputedStyle(game_rank_mask).display);
                    console.log('Modal in DOM:', document.body.contains(game_rank_mask));
                    
                    // 强制显示弹窗并确保样式正确
                    game_rank_mask.style.display = 'block';
                    game_rank_mask.style.visibility = 'visible';
                    game_rank_mask.style.opacity = '1';
                    game_rank_mask.style.zIndex = '9999999';
                    
                    console.log('Modal display after setting to block:', game_rank_mask.style.display);
                    console.log('Modal computed style after setting:', window.getComputedStyle(game_rank_mask).display);
                    console.log('Modal visibility:', window.getComputedStyle(game_rank_mask).visibility);
                    console.log('Modal opacity:', window.getComputedStyle(game_rank_mask).opacity);
                    console.log('Modal z-index:', window.getComputedStyle(game_rank_mask).zIndex);
                } else {
                    console.log('Detected as DRAG - not opening modal');
                }
            } else if (!drageable) {
                // 备用点击检测
                console.log('Backup click detection - opening modal');
                console.log('Backup - Modal element:', game_rank_mask);
                console.log('Backup - Modal current display:', game_rank_mask.style.display);
                game_rank_mask.style.display = 'block';
                console.log('Backup - Modal display after setting to block:', game_rank_mask.style.display);
            }
            drageable = false;
            console.log('touchend - final drageable:', drageable);
        });
    } else {
        /* 非触摸设备的事件监听 */
        movableElement.addEventListener('mousedown', function (event) {
            event.preventDefault(); /* 阻止默认行为，如选中文本 */
            document.addEventListener('mousemove', handleMove);
        });
        document.addEventListener('mouseup', function () {
            document.removeEventListener('mousemove', handleMove);
        });
        movableElement.addEventListener('mouseup', function (event) {
            if (!drageable) {
                game_rank_mask.style.display = 'block';
            }
            drageable = false;
        });
    }

}
