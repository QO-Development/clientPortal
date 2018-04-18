$(document).ready(function () {
    //$(staticAncestors).on(eventName, dynamicChild, function() {});
    $('#storeNameNumber').on('click', '#manualEntryLink', function () {
        //Get rid of unneeded form element
        $("#storeNameNumber").fadeOut(300, function () {
            console.log("Complete")
        });
        //Fade in required form elements 
        $("#manualEntryForm").fadeIn(300, function () {
            console.log("Complete in")
        });
        //TODO: Add 'required' attribute to form elements that were just displayed on page
        $("#manual1").prop('required', true);
        $("#manual2").prop('required', true);
        //Not required. This is the address 2 field
        //$("#manual3").prop('required', true);
        $("#manual4").prop('required', true);
        $("#manual5").prop('required', true);
        $("#manual6").prop('required', true);
        $("#manual7").prop('required', true);
    });
});  
