const {ipcRenderer} = require('electron')

exports.initialize = function(){

    ipcRenderer.on('error-popup', (event, error_msg) => {
        launchPopup(error_msg, 'error');
    })
    ipcRenderer.on('empty_rsp-popup', (event, empty_rsp_msg) => {
        launchPopup(empty_rsp_msg, 'empty_rsp');
    })
    ipcRenderer.on('success-popup', (event, success_msg) => {
        launchPopup(success_msg, 'success');
    })
}


function launchPopup(message, type) {
    let modal = $('#popup_modal');

    let mBody = $('#popup_modal-body');
    mBody.empty();
    let bodyText = $('<p class="text-monospace">' + message + '</p>')
    mBody.append(bodyText)
    modal.modal('show')

    let mHeader = $('#popup-modal-header').empty()
    $('#popup-modal-header').attr("class","modal-header")
    let headerText = $(`<h5 id="popup-modal-header" class="modal-title text-monospace"></h5>`);
    switch (type) {
        case "error": {
            mHeader.addClass('bg-danger')
            headerText.text('Error')
            if($('#wait_modal').hasClass('show'))
                $('#myModal').modal('hide')
            break
        }
        case "empty_rsp": {
             mHeader.addClass('bg-info')
             headerText.text('Info')
             break
        }
        case "success": {
            mHeader.addClass('bg-success')
            headerText.text('Success')
            $('#wait_modal').modal('hide');
            break
       }
    }

    mHeader.append(headerText)
        .append(`
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>`)
}