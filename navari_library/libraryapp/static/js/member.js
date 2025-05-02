$(document).ready(function () {
  let currentFilter = "all";
  let searchQuery = "";

  checkForStoredNotification();

  loadMembers();

  $("#search-input").on("keyup", function () {
    searchQuery = $(this).val().toLowerCase();
    loadMembers();
  });

  $("#filter-all").on("click", function () {
    updateFilterButtons("all");
    currentFilter = "all";
    loadMembers();
  });

  $("#filter-active").on("click", function () {
    updateFilterButtons("active");
    currentFilter = "active";
    loadMembers();
  });

  $("#filter-restricted").on("click", function () {
    updateFilterButtons("restricted");
    currentFilter = "restricted";
    loadMembers();
  });

  $("#filter-with-debt").on("click", function () {
    updateFilterButtons("with-debt");
    currentFilter = "with-debt";
    loadMembers();
  });

  $("#filter-without-debt").on("click", function () {
    updateFilterButtons("without-debt");
    currentFilter = "without-debt";
    loadMembers();
  });

  function updateFilterButtons(activeFilter) {
    $("#filter-all, #filter-active, #filter-restricted, #filter-with-debt, #filter-without-debt")
      .removeClass("bg-blue-500 text-white")
      .addClass("bg-gray-200 hover:bg-gray-300");
    $(`#filter-${activeFilter}`)
      .removeClass("bg-gray-200 hover:bg-gray-300")
      .addClass("bg-blue-500 text-white");
  }

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
          $("#member-count").text("Showing 0 of 0 members");
          return;
        }

        let filteredData = data.filter(function (member) {
          const debt = parseFloat(member.outstanding_debt);
          const isRestricted = debt > 500;
          
          if (currentFilter === "active" && isRestricted) {
            return false;
          }
          if (currentFilter === "restricted" && !isRestricted) {
            return false;
          }
          if (currentFilter === "with-debt" && debt <= 0) {
            return false;
          }
          if (currentFilter === "without-debt" && debt > 0) {
            return false;
          }

          if (searchQuery) {
            const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
            return fullName.includes(searchQuery);
          }

          return true;
        });

        if (filteredData.length === 0) {
          $("#member-list").append(
            '<tr><td colspan="6" class="px-6 py-4 text-center">No matching members found</td></tr>'
          );
          $("#member-count").text(`Showing 0 of ${data.length} members`);
          return;
        }

        $.each(filteredData, function (index, member) {
          const debt = parseFloat(member.outstanding_debt);
          const isRestricted = debt > 500;

          const debtClass = isRestricted
            ? "px-4 py-3 text-red-600 font-semibold"
            : "px-4 py-3";

          const statusTag = isRestricted
            ? `<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">Restricted</span>`
            : `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Active</span>`;

          let profileImg = member.profile_pic
            ? `<img src="${member.profile_pic}" alt="${member.first_name}" class="h-12 w-auto object-cover">`
            : '<div class="h-12 w-10 bg-gray-200 flex items-center justify-center text-gray-500">N/A</div>';

          let row = `
            <tr class="border-t hover:bg-gray-50">
                <td class="px-4 py-3">${member.first_name} ${member.last_name}</td>
                <td class="px-4 py-3">${member.email}</td>
                <td class="px-4 py-3">${member.joined_date}</td>
                <td class="${debtClass}">Ksh ${debt.toFixed(2)}</td>
                <td class="px-4 py-3">${statusTag}</td>
                <td class="px-4 py-3 flex items-center space-x-2">
                    <a href="/members/view/${member.id}" 
                      class="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-md transition" 
                      title="View ${member.first_name}">
                      View
                    </a>
                    <button class="text-red-600 hover:text-red-800 delete-member" 
                            data-id="${member.id}" 
                            data-name="${member.first_name} ${member.last_name}"
                            title="Delete ${member.first_name}">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
          `;

          $("#member-list").append(row);
        });

        $("#member-count").text(
          `Showing ${filteredData.length} of ${data.length} members`
        );

        $(".delete-member").click(function () {
          let memberId = $(this).data("id");
          let memberName = $(this).data("name");

          $("#deleteMemberName").text(memberName);
          $("#confirmDelete").data("id", memberId);
          $("#deleteConfirmModal").removeClass("hidden");
        });
      },
      error: function (xhr) {
        console.error("Error loading members:", xhr);
        showNotification("Failed to load members. Please try again later.", "error");
      },
    });
  }

  $("#cancelDelete").click(function () {
    $("#deleteConfirmModal").addClass("hidden");
  });

  $("#confirmDelete").click(function () {
    let memberId = $(this).data("id");
    deleteMember(memberId);
    $("#deleteConfirmModal").addClass("hidden");
  });

  $("#deleteConfirmModal").click(function (e) {
    if (e.target === this) {
      $(this).addClass("hidden");
    }
  });

  function deleteMember(memberId) {
    $.ajax({
      url: `/api/members/${memberId}/`,
      type: "DELETE",
      success: function () {
        showNotification("Member deleted successfully!", "success");
        loadMembers();
      },
      error: function (xhr) {
        console.error("Error deleting member:", xhr);
        showNotification("Failed to delete member. Please try again later.", "error");
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
        storeNotification("Member added successfully!", "success");
        window.location.href = "/members/";
      },
      error: function (xhr) {
        console.error("Error adding member:", xhr);

        if (xhr.responseJSON) {
          let errors = "";
          $.each(xhr.responseJSON, function (field, messages) {
            errors += `${field}: ${messages.join(", ")}\n`;
          });
          showNotification(`Failed to add member: ${errors}`, "error");
        } else {
          showNotification(
            "Failed to add member. Please check your inputs and try again.",
            "error"
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

        $("#editMemberModal").removeClass("hidden");
      },
      error: function (error) {
        console.error("Error fetching member details:", error);
        showNotification("Failed to load member details. Please try again.", "error");
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

        storeNotification("Member updated successfully", "success");
        window.location.reload();
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
    checkForStoredNotification();

    const notificationClass =
      type === "success" ? "bg-green-500" : "bg-red-500";

    const notification = $(`
      <div class="fixed top-4 right-4 px-4 py-2 rounded-md text-white ${notificationClass} shadow-lg transition-opacity duration-300 z-50">
          ${message}
      </div>
    `);

    $("body").append(notification);

    setTimeout(function () {
      notification.css("opacity", "0");
      setTimeout(function () {
        notification.remove();
      }, 300);
    }, 6000);
  }

  function storeNotification(message, type) {
    sessionStorage.setItem("notification_message", message);
    sessionStorage.setItem("notification_type", type);
    sessionStorage.setItem("notification_time", new Date().getTime());
  }

  function checkForStoredNotification() {
    const message = sessionStorage.getItem("notification_message");
    const type = sessionStorage.getItem("notification_type");
    const time = sessionStorage.getItem("notification_time");

    if (message && type && time) {
      const currentTime = new Date().getTime();
      const timeDiff = currentTime - parseInt(time);

      if (timeDiff < 6000) {
        const remainingTime = 6000 - timeDiff;

        const notificationClass =
          type === "success" ? "bg-green-500" : "bg-red-500";

        const notification = $(`
          <div class="fixed top-4 right-4 px-4 py-2 rounded-md text-white ${notificationClass} shadow-lg transition-opacity duration-300 z-50">
              ${message}
          </div>
        `);

        $("body").append(notification);

        setTimeout(function () {
          notification.css("opacity", "0");
          setTimeout(function () {
            notification.remove();
          }, 300);
        }, remainingTime);
      }

      sessionStorage.removeItem("notification_message");
      sessionStorage.removeItem("notification_type");
      sessionStorage.removeItem("notification_time");
    }
  }
});
