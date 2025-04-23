$(document).ready(function () {
  loadMembers();

  function loadMembers() {
    $.ajax({
      url: "/api/members/",
      type: "GET",
      success: function (data) {
        $("#member-list").empty();

        if (data.length === 0) {
          $("#member-list").append(
            '<tr><td colspan="6" class="px-6 py-4 text-center">No members available</td></tr>'
          );
          return;
        }

        $.each(data, function (index, member) {
          const debt = parseFloat(member.outstanding_debt);
          const isRestricted = debt > 500;

          const debtClass = isRestricted
            ? "px-6 py-4 text-red-600 font-semibold"
            : "px-6 py-4";

          const statusTag = isRestricted
            ? `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">Restricted</span>`
            : `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Active</span>`;

          let profileImg = member.profile_pic
            ? `<img src="${member.profile_pic}" alt="${member.first_name}" class="h-12 w-auto object-cover">`
            : '<div class="h-12 w-10 bg-gray-200 flex items-center justify-center text-gray-500">N/A</div>';

          let row = `
        <tr class="border-t">
            <td class="px-4 py-3">${member.first_name} ${member.last_name}</td>
            <td class="px-6 py-4 whitespace-nowrap">${member.email}</td>
            <td class="px-6 py-4 whitespace-nowrap">${member.joined_date}</td>
            <td class="${debtClass}">Ksh ${debt.toFixed(2)}</td>
            <td class="px-4 py-3">${statusTag}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <a href="/members/view/${
                  member.id
                }" class="text-indigo-600 hover:text-indigo-900 mr-3" title="View ${
            member.first_name
          }">View</a>
                <button class="text-red-600 hover:text-red-900 delete-member" data-id="${
                  member.id
                }">Delete</button>
            </td>
        </tr>
    `;

          $("#member-list").append(row);
        });

        $(".delete-member").click(function () {
          let memberId = $(this).data("id");
          if (confirm("Are you sure you want to delete this member?")) {
            deleteMember(memberId);
          }
        });
      },
      error: function (xhr) {
        console.error("Error loading members:", xhr);
        alert("Failed to load members. Please try again later.");
      },
    });
  }

  function deleteMember(memberId) {
    $.ajax({
      url: `/api/members/${memberId}/`,
      type: "DELETE",
      success: function () {
        loadMembers();
      },
      error: function (xhr) {
        console.error("Error deleting member:", xhr);
        alert("Failed to delete member. Please try again later.");
      },
    });
  }

  $("#add-member-form").submit(function (e) {
    e.preventDefault();

    let formData = new FormData(this);

    $.ajax({
      url: "/api/members/",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        alert("Member added successfully!");
        window.location.href = "/members/";
      },
      error: function (xhr) {
        console.error("Error adding member:", xhr);

        if (xhr.responseJSON) {
          let errors = "";
          $.each(xhr.responseJSON, function (field, messages) {
            errors += `${field}: ${messages.join(", ")}\n`;
          });
          alert(`Failed to add member:\n${errors}`);
        } else {
          alert(
            "Failed to add member. Please check your inputs and try again."
          );
        }
      },
    });
  });

  const currentMemberId = window.location.pathname
    .split("/")
    .filter(Boolean)
    .pop();

  $("#editMemberBtn").on("click", function () {
    $.ajax({
      url: `/api/members/${currentMemberId}/`,
      method: "GET",
      success: function (data) {
        $("#input_first_name").val(data.first_name);
        $("#input_last_name").val(data.last_name);
        $("#input_email").val(data.email);
        $("#input_phone_number").val(data.phone_number);
        $("#input_date_of_birth").val(data.date_of_birth);
        $("#input_postal_address").val(data.postal_address);
        $("#input_joined_date").val(data.joined_date);
        $("#input_outstanding_debt").val(data.outstanding_debt);

        $("#editMemberModal").removeClass("hidden");
      },
      error: function (error) {
        console.error("Error fetching member details:", error);
        alert("Failed to load member details. Please try again.");
      },
    });
  });

  $("#closeModal, #cancelEdit").on("click", function () {
    $("#editMemberModal").addClass("hidden");
  });

  $("#editMemberForm").on("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);

    $.ajax({
      url: `/api/members/${currentMemberId}/update/`,
      method: "PUT",
      data: formData,
      processData: false,
      contentType: false,
      success: function (data) {
        $("#memberName").text(`${data.first_name} ${data.last_name}`);
        $("#memberEmail").text(data.email);
        $("#memberPhone").text(data.phone_number || "N/A");
        $("#memberDOB").text(data.date_of_birth || "N/A");
        $("#memberAddress").text(data.postal_address || "N/A");
        $("#memberJoinDate").text(data.joined_date);
        $("#memberDebt").text(`Ksh ${data.outstanding_debt}`);

        if (
          formData.get("profile_pic") &&
          formData.get("profile_pic").size > 0
        ) {
          window.location.reload();
        } else {
          $("#editMemberModal").addClass("hidden");
        }

        showNotification("Member updated successfully", "success");
      },
      error: function (error) {
        console.error("Error updating member:", error);
        showNotification(
          "Failed to update member. Please check the form and try again.",
          "error"
        );
      },
    });
  });

  function showNotification(message, type) {
    const notificationClass =
      type === "success" ? "bg-green-500" : "bg-red-500";

    const notification = $(`
            <div class="fixed top-4 right-4 px-4 py-2 rounded-md text-white ${notificationClass} shadow-lg transition-opacity duration-300">
                ${message}
            </div>
        `);

    $("body").append(notification);

    setTimeout(function () {
      notification.css("opacity", "0");
      setTimeout(function () {
        notification.remove();
      }, 300);
    }, 3000);
  }
});
